-- 012: manual billing switch (active / suspended), flipped by you in the SQL Editor.
--
-- * Table restaurant_billing: one row per café. NO café has a row by default = active.
--   Row-level security is on with NO policies, so neither customers nor staff can read or
--   write it directly. Only you (SQL Editor / service key) can.
-- * current_restaurant_id() returns NULL for a suspended café. Every staff policy compares
--   against it, so staff reads and writes (orders, menu, tables, photos, staff_place_order,
--   import_menu ...) are all blocked in one place.
-- * my_billing_status(): lets the dashboard ask "is my café paused?" (staff cannot read the
--   table itself). restaurant_is_open(slug): lets the customer pages ask the same.
-- * place_order refuses suspended cafés. Customers already seated can still request the
--   bill and pay.
--
-- TO SUSPEND (works even if the café has no row yet):
--   insert into public.restaurant_billing (restaurant_id, status, note)
--   select id, 'suspended', 'unpaid - Nov' from public.restaurants where slug = 'white-cave'
--   on conflict (restaurant_id) do update
--     set status = excluded.status, note = excluded.note, updated_at = now();
-- TO REACTIVATE:
--   update public.restaurant_billing set status = 'active', note = null, updated_at = now()
--   where restaurant_id = (select id from public.restaurants where slug = 'white-cave');

create table if not exists public.restaurant_billing (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  status text not null default 'active',
  note text,
  updated_at timestamptz not null default now(),
  constraint restaurant_billing_status_check check (status in ('active', 'suspended'))
);

alter table public.restaurant_billing enable row level security;
revoke all on public.restaurant_billing from anon, authenticated;

insert into public.restaurant_billing (restaurant_id)
select id from public.restaurants
on conflict (restaurant_id) do nothing;

create or replace function public.current_restaurant_id()
 returns uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select sp.restaurant_id
  from public.staff_profiles sp
  where sp.id = auth.uid()
    and not exists (
      select 1 from public.restaurant_billing b
      where b.restaurant_id = sp.restaurant_id and b.status = 'suspended'
    )
$function$;

create or replace function public.my_billing_status()
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(
    (select b.status
     from public.staff_profiles sp
     join public.restaurant_billing b on b.restaurant_id = sp.restaurant_id
     where sp.id = auth.uid()),
    'active')
$function$;

create or replace function public.restaurant_is_open(p_restaurant_slug text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select not exists (
    select 1
    from public.restaurants r
    join public.restaurant_billing b on b.restaurant_id = r.id
    where r.slug = p_restaurant_slug and b.status = 'suspended'
  )
$function$;

revoke all on function public.my_billing_status() from public, anon, authenticated;
grant execute on function public.my_billing_status() to authenticated;
revoke all on function public.restaurant_is_open(text) from public, anon, authenticated;
grant execute on function public.restaurant_is_open(text) to anon, authenticated;

-- place_order: same as before, plus the suspended check (and a pinned search_path).
CREATE OR REPLACE FUNCTION public.place_order(p_restaurant_slug text, p_table_id uuid, p_guest_count integer, p_items jsonb)
 RETURNS TABLE(order_id uuid, order_number text, validation_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_restaurant_id uuid;
 v_tax_rate numeric;
 v_session_id uuid;
 v_guest_ids uuid[];
 v_order_id uuid := gen_random_uuid();
 v_order_number text := to_char(now(), 'HH24MISS') || lpad(floor(random() * 100)::text, 2, '0');
 v_validation_code text := lpad(floor(random() * 10000)::text, 4, '0');
 v_item jsonb;
 v_addon_id text;
 v_menu_item record;
 v_size_name text;
 v_size_price numeric;
 v_unit_price numeric;
 v_addon_total numeric;
 v_total_price numeric;
 v_quantity int;
 v_subtotal numeric := 0;
 v_tax numeric;
 v_total numeric;
 v_order_item_id uuid;
 v_assigned_guest_id uuid;
begin
 -- ==================== NEW: one call per table at a time ====================
 perform pg_advisory_xact_lock(hashtext(p_table_id::text));
 -- =============================================================================

 select id, tax_rate into v_restaurant_id, v_tax_rate
 from public.restaurants where slug = p_restaurant_slug;

 if v_restaurant_id is null then
 raise exception 'Unknown restaurant';
 end if;

 -- A suspended café takes no new customer orders (customers already seated can
 -- still ask for the bill and pay: request_bill / confirm_payment are untouched).
 if exists (
 select 1 from public.restaurant_billing
 where restaurant_id = v_restaurant_id and status = 'suspended'
 ) then
 raise exception 'This café isn''t taking orders right now.';
 end if;

 if not exists (
 select 1 from public.restaurant_tables
 where id = p_table_id and restaurant_id = v_restaurant_id
 ) then
 raise exception 'Unknown table for this restaurant';
 end if;

 -- ==================== NEW: reserved-table hold ====================
 -- A table with a booking inside its hold window (30 minutes before to 30
 -- minutes after the booking time) can't take new customer orders, unless a
 -- party is already seated there.
 if exists (
 select 1 from public.restaurant_tables
 where id = p_table_id
 and reserved_for is not null
 and now() between reserved_for - interval '30 minutes'
 and reserved_for + interval '30 minutes'
 ) and not exists (
 select 1 from public.table_sessions
 where table_id = p_table_id and status <> 'closed'
 ) then
 raise exception 'This table is reserved. Please ask a member of staff.';
 end if;
 -- ==================================================================

 -- ==================== NEW: per-restaurant burst cap ====================
 if (
 select count(*) from public.orders
 where restaurant_id = v_restaurant_id
 and created_at > now() - interval '1 minute'
 ) >= 60 then
 raise exception 'Too many orders right now — please try again shortly';
 end if;
 -- =========================================================================

 select id into v_session_id
 from public.table_sessions
 where table_id = p_table_id and status <> 'closed'
 order by started_at desc
 limit 1;

 if v_session_id is null then
 insert into public.table_sessions (restaurant_id, table_id, status)
 values (v_restaurant_id, p_table_id, 'open')
 returning id into v_session_id;

 with inserted_guests as (
 insert into public.session_guests (session_id, name, sort_order)
 select v_session_id, 'Guest ' || n, n
 from generate_series(1, greatest(p_guest_count, 1)) as n
 returning id, sort_order
 )
 select array_agg(id order by sort_order) into v_guest_ids from inserted_guests;

 update public.restaurant_tables
 set status = 'occupied'
 where id = p_table_id and status = 'available';
 else
 select array_agg(id order by sort_order) into v_guest_ids
 from public.session_guests where session_id = v_session_id;
 end if;

 insert into public.orders (
 id, restaurant_id, table_id, session_id,
 order_number, validation_code, status, subtotal, tax, total
 ) values (
 v_order_id, v_restaurant_id, p_table_id, v_session_id,
 v_order_number, v_validation_code, 'awaiting_validation', 0, 0, 0
 );

 for v_item in select * from jsonb_array_elements(p_items)
 loop
 select id, name, price, image_url into v_menu_item
 from public.menu_items
 where id = (v_item ->> 'menu_item_id')::uuid
 and restaurant_id = v_restaurant_id
 and available = true;

 if v_menu_item.id is null then
 raise exception 'Menu item not available: %', v_item ->> 'menu_item_id';
 end if;

 v_unit_price := v_menu_item.price;
 v_size_name := null;
 v_size_price := null;

 if (v_item ->> 'size_id') is not null then
 select name, price into v_size_name, v_size_price
 from public.menu_item_sizes
 where id = (v_item ->> 'size_id')::uuid and menu_item_id = v_menu_item.id;

 if v_size_name is not null then
 v_unit_price := v_unit_price + v_size_price;
 end if;
 end if;

 v_addon_total := 0;
 if jsonb_typeof(v_item -> 'addon_ids') = 'array' then
 for v_addon_id in select * from jsonb_array_elements_text(v_item -> 'addon_ids')
 loop
 select v_addon_total + coalesce(price, 0) into v_addon_total
 from public.menu_item_addons
 where id = v_addon_id::uuid and menu_item_id = v_menu_item.id;
 end loop;
 end if;

 v_unit_price := v_unit_price + v_addon_total;

 v_quantity := least(greatest(coalesce((v_item ->> 'quantity')::int, 1), 1), 20);
 v_total_price := v_unit_price * v_quantity;

 v_assigned_guest_id := null;
 if (v_item ->> 'guest_index') is not null then
 v_assigned_guest_id := v_guest_ids[(v_item ->> 'guest_index')::int];
 end if;

 insert into public.order_items (
 id, order_id, menu_item_id, name, image_url, base_price,
 size_name, size_price, note, quantity, unit_price, total_price, assigned_guest_id
 ) values (
 gen_random_uuid(), v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.image_url, v_menu_item.price,
 v_size_name, v_size_price, v_item ->> 'note',
 v_quantity, v_unit_price, v_total_price, v_assigned_guest_id
 ) returning id into v_order_item_id;

 if jsonb_typeof(v_item -> 'addon_ids') = 'array' then
 for v_addon_id in select * from jsonb_array_elements_text(v_item -> 'addon_ids')
 loop
 insert into public.order_item_addons (order_item_id, name, price)
 select v_order_item_id, a.name, a.price
 from public.menu_item_addons a
 where a.id = v_addon_id::uuid;
 end loop;
 end if;

 v_subtotal := v_subtotal + v_total_price;
 end loop;

 v_tax := round(v_subtotal * v_tax_rate);
 v_total := v_subtotal + v_tax;

 update public.orders
 set subtotal = v_subtotal, tax = v_tax, total = v_total
 where id = v_order_id;

 return query select v_order_id, v_order_number, v_validation_code;
end;
$function$;