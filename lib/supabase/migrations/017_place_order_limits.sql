-- 017_place_order_limits.sql
-- Tightens place_order (the public, no-login door) and gives every new order a short,
-- unique, per-day number.
--   * caps: 30 items per order, 20 guests per table, notes <= 200 chars, <= 20 add-ons per item
--   * rate limit: 5 orders per table per minute (café-wide backstop raised to 120)
--   * order numbers: 001, 002, ... per café per business day; unique by a counter + a unique index
--   * staff_place_order uses the same numbering (its own 50-line cap is unchanged)
-- Old orders keep their old numbers (business_day stays NULL for them).
-- Safe to run twice. Run in the Supabase SQL Editor.

alter table public.orders add column if not exists business_day date;

create unique index if not exists orders_unique_number_per_day
  on public.orders (restaurant_id, business_day, order_number)
  where business_day is not null;

create table if not exists public.order_counters (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  business_day  date not null,
  last_number   int  not null default 0,
  primary key (restaurant_id, business_day)
);
alter table public.order_counters enable row level security;
revoke all on public.order_counters from public, anon, authenticated;

-- Internal helper: not callable by guests or staff, only by the two order functions below.
create or replace function public.next_order_number(p_restaurant_id uuid)
 returns table (day date, number text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_day date;
  v_n int;
begin
  select ((now() at time zone r.timezone) - r.day_start_time::interval)::date
    into v_day
  from public.restaurants r where r.id = p_restaurant_id;

  insert into public.order_counters as c (restaurant_id, business_day, last_number)
  values (p_restaurant_id, v_day, 1)
  on conflict (restaurant_id, business_day)
  do update set last_number = c.last_number + 1
  returning c.last_number into v_n;

  return query select v_day, lpad(v_n::text, 3, '0');
end;
$function$;
revoke all on function public.next_order_number(uuid) from public, anon, authenticated;

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
 v_order_number text;
 v_business_day date;
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
 -- ==================== 017: input limits (checked before anything is touched) ====================
 if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
 raise exception 'Add at least one item to the order';
 end if;
 if jsonb_array_length(p_items) > 30 then
 raise exception 'Too many items in one order (the limit is 30). Please place a second order.';
 end if;
 if coalesce(p_guest_count, 1) > 20 then
 raise exception 'Too many guests for one table (the limit is 20). Please ask a member of staff.';
 end if;
 -- ====================================================================================================

 -- one call per table at a time
 perform pg_advisory_xact_lock(hashtext(p_table_id::text));
 
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

 -- ==================== 017: rate limits ====================
 -- Per table: one customer (or one phone) can't flood the kitchen or lock out the others.
 if (
 select count(*) from public.orders
 where table_id = p_table_id
 and created_at > now() - interval '1 minute'
 ) >= 5 then
 raise exception 'Too many orders from this table — please wait a minute and try again';
 end if;
 -- Whole café: a high backstop only.
 if (
 select count(*) from public.orders
 where restaurant_id = v_restaurant_id
 and created_at > now() - interval '1 minute'
 ) >= 120 then
 raise exception 'Too many orders right now — please try again shortly';
 end if;
 -- ==========================================================

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

 select n.day, n.number into v_business_day, v_order_number
 from public.next_order_number(v_restaurant_id) n;

 insert into public.orders (
 id, restaurant_id, table_id, session_id, business_day,
 order_number, validation_code, status, subtotal, tax, total
 ) values (
 v_order_id, v_restaurant_id, p_table_id, v_session_id, v_business_day,
 v_order_number, v_validation_code, 'awaiting_validation', 0, 0, 0
 );

 for v_item in select * from jsonb_array_elements(p_items)
 loop
 if length(coalesce(v_item ->> 'note', '')) > 200 then
 raise exception 'A note is too long (the limit is 200 characters)';
 end if;
 if jsonb_typeof(v_item -> 'addon_ids') = 'array' and jsonb_array_length(v_item -> 'addon_ids') > 20 then
 raise exception 'Too many add-ons on one item';
 end if;

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

CREATE OR REPLACE FUNCTION public.staff_place_order(p_table_id uuid, p_guest_count integer, p_items jsonb)
 RETURNS TABLE(order_id uuid, order_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_restaurant_id uuid := public.current_restaurant_id();
 v_user_id uuid := auth.uid();
 v_tax_rate numeric;
 v_session_id uuid;
 v_session_paid boolean;
 v_guest_ids uuid[];
 v_order_id uuid := gen_random_uuid();
 v_order_number text;
 v_business_day date;
 v_item jsonb;
 v_idx int := 0;
 v_menu_item record;
 v_addon record;
 v_addon_ids text[];
 v_addon_id text;
 v_size_name text;
 v_size_price numeric;
 v_unit_price numeric;
 v_addon_total numeric;
 v_quantity int;
 v_total_price numeric;
 v_subtotal numeric := 0;
 v_tax numeric;
 v_total numeric;
 v_order_item_id uuid;
 v_guest_index int;
 v_assigned_guest_id uuid;
begin
 if v_restaurant_id is null or v_user_id is null then
 raise exception 'You must be signed in to a restaurant account to take orders';
 end if;

 if p_items is null or jsonb_typeof(p_items) <> 'array'
 or jsonb_array_length(p_items) = 0 then
 raise exception 'Add at least one item to the order';
 end if;

 if jsonb_array_length(p_items) > 50 then
 raise exception 'Too many lines in one order (the limit is 50)';
 end if;

 -- Same lock key as place_order, so a customer order and a staff order for
 -- the same table can never interleave.
 perform pg_advisory_xact_lock(hashtext(p_table_id::text));

 select tax_rate into v_tax_rate
 from public.restaurants where id = v_restaurant_id;

 if not exists (
 select 1 from public.restaurant_tables
 where id = p_table_id and restaurant_id = v_restaurant_id
 ) then
 raise exception 'Unknown table for this restaurant';
 end if;

 select id, (payment_status = 'paid') into v_session_id, v_session_paid
 from public.table_sessions
 where table_id = p_table_id
 and restaurant_id = v_restaurant_id
 and status <> 'closed'
 order by started_at desc
 limit 1;

 if v_session_id is not null and coalesce(v_session_paid, false) then
 raise exception 'This table has already paid. Free the table before taking a new order';
 end if;

 if v_session_id is null then
 if p_guest_count is null or p_guest_count < 1 or p_guest_count > 30 then
 raise exception 'The number of guests must be between 1 and 30';
 end if;

 insert into public.table_sessions (restaurant_id, table_id, status)
 values (v_restaurant_id, p_table_id, 'open')
 returning id into v_session_id;

 with inserted_guests as (
 insert into public.session_guests (session_id, name, sort_order)
 select v_session_id, 'Guest ' || n, n
 from generate_series(1, p_guest_count) as n
 returning id, sort_order
 )
 select array_agg(id order by sort_order) into v_guest_ids from inserted_guests;

 update public.restaurant_tables
 set status = 'occupied'
 where id = p_table_id and status = 'available';

 -- Seating guests ends a booking whose hold window is active.
 update public.restaurant_tables
 set reserved_for = null, reservation_note = null
 where id = p_table_id
 and reserved_for is not null
 and now() between reserved_for - interval '30 minutes'
 and reserved_for + interval '30 minutes';
 else
 select array_agg(id order by sort_order) into v_guest_ids
 from public.session_guests where session_id = v_session_id;
 end if;

 select n.day, n.number into v_business_day, v_order_number
 from public.next_order_number(v_restaurant_id) n;

 insert into public.orders (
 id, restaurant_id, table_id, session_id, business_day, order_number, validation_code,
 status, subtotal, tax, total, source, placed_by
 ) values (
 v_order_id, v_restaurant_id, p_table_id, v_session_id, v_business_day, v_order_number, 'STAFF',
 'pending', 0, 0, 0, 'staff', v_user_id
 );

 for v_item in select * from jsonb_array_elements(p_items)
 loop
 v_idx := v_idx + 1;

 select id, name, price, image_url into v_menu_item
 from public.menu_items
 where id = (v_item ->> 'menu_item_id')::uuid
 and restaurant_id = v_restaurant_id
 and available = true;

 if v_menu_item.id is null then
 raise exception 'Line %: that menu item is not available', v_idx;
 end if;

 v_unit_price := v_menu_item.price;
 v_size_name := null;
 v_size_price := null;

 if nullif(v_item ->> 'size_id', '') is not null then
 select name, price into v_size_name, v_size_price
 from public.menu_item_sizes
 where id = (v_item ->> 'size_id')::uuid and menu_item_id = v_menu_item.id;

 if v_size_name is null then
 raise exception 'Line % (%): unknown size', v_idx, v_menu_item.name;
 end if;

 v_unit_price := v_unit_price + v_size_price;
 end if;

 -- Add-ons must belong to THIS item; the same add-on is only counted once.
 v_addon_ids := array[]::text[];
 v_addon_total := 0;

 if jsonb_typeof(v_item -> 'addon_ids') = 'array' then
 select coalesce(array_agg(distinct a), array[]::text[]) into v_addon_ids
 from jsonb_array_elements_text(v_item -> 'addon_ids') as a;

 foreach v_addon_id in array v_addon_ids
 loop
 select name, price into v_addon
 from public.menu_item_addons
 where id = v_addon_id::uuid and menu_item_id = v_menu_item.id;

 if v_addon.name is null then
 raise exception 'Line % (%): unknown add-on', v_idx, v_menu_item.name;
 end if;

 v_addon_total := v_addon_total + coalesce(v_addon.price, 0);
 end loop;
 end if;

 v_unit_price := v_unit_price + v_addon_total;

 v_quantity := least(greatest(coalesce((v_item ->> 'quantity')::int, 1), 1), 20);
 v_total_price := v_unit_price * v_quantity;

 v_assigned_guest_id := null;
 v_guest_index := nullif(v_item ->> 'guest_index', '')::int;

 if v_guest_index is not null then
 if v_guest_index < 1 or v_guest_index > coalesce(array_length(v_guest_ids, 1), 0) then
 raise exception 'Line % (%): unknown guest', v_idx, v_menu_item.name;
 end if;

 v_assigned_guest_id := v_guest_ids[v_guest_index];
 end if;

 insert into public.order_items (
 id, order_id, menu_item_id, name, image_url, base_price,
 size_name, size_price, note, quantity, unit_price, total_price, assigned_guest_id
 ) values (
 gen_random_uuid(), v_order_id, v_menu_item.id, v_menu_item.name,
 v_menu_item.image_url, v_menu_item.price,
 v_size_name, v_size_price,
 left(nullif(btrim(v_item ->> 'note'), ''), 200),
 v_quantity, v_unit_price, v_total_price, v_assigned_guest_id
 ) returning id into v_order_item_id;

 if array_length(v_addon_ids, 1) is not null then
 insert into public.order_item_addons (order_item_id, name, price)
 select v_order_item_id, a.name, a.price
 from public.menu_item_addons a
 where a.menu_item_id = v_menu_item.id
 and a.id::text = any (v_addon_ids);
 end if;

 v_subtotal := v_subtotal + v_total_price;
 end loop;

 v_tax := round(v_subtotal * v_tax_rate);
 v_total := v_subtotal + v_tax;

 update public.orders
 set subtotal = v_subtotal, tax = v_tax, total = v_total
 where id = v_order_id;

 return query select v_order_id, v_order_number;
end;
$function$;

-- create or replace keeps the existing grants; restated so this file is self-contained.
revoke all on function public.place_order(text, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text, uuid, integer, jsonb) to anon;
grant execute on function public.place_order(text, uuid, integer, jsonb) to authenticated;
revoke all on function public.staff_place_order(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.staff_place_order(uuid, integer, jsonb) to authenticated;