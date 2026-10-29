-- 014: UPI + cash payment (no gateway).
-- Customers can only CLAIM a payment (unpaid -> claimed). Only staff can mark it paid.

-- 1. Session payment fields ------------------------------------------------
alter table public.table_sessions drop constraint if exists table_sessions_payment_status_check;
alter table public.table_sessions add constraint table_sessions_payment_status_check
  check (payment_status = any (array['unpaid','claimed','paid']));

alter table public.table_sessions
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('upi','cash','card')),
  add column if not exists payment_claimed_at timestamptz,
  add column if not exists paid_at timestamptz;

create or replace function public.stamp_payment_times()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.payment_status is distinct from old.payment_status then
    new.payment_claimed_at := case when new.payment_status = 'claimed' then now()
                                   when new.payment_status = 'unpaid' then null
                                   else old.payment_claimed_at end;
    new.paid_at := case when new.payment_status = 'paid' then now() else null end;
    if new.payment_status = 'unpaid' then new.payment_method := null; end if;
  end if;
  return new;
end $$;

drop trigger if exists table_sessions_stamp_payment on public.table_sessions;
create trigger table_sessions_stamp_payment before update on public.table_sessions
  for each row execute function public.stamp_payment_times();

-- 2. Per-café payment settings (owner writes; customers read via a function) -
create table if not exists public.restaurant_payment_settings (
  restaurant_id  uuid primary key references public.restaurants(id) on delete cascade,
  upi_id         text check (upi_id is null or upi_id ~ '^[A-Za-z0-9._-]{2,100}@[A-Za-z][A-Za-z0-9.]{1,63}$'),
  upi_payee_name text check (upi_payee_name is null or (char_length(upi_payee_name) between 1 and 60 and upi_payee_name !~ '[[:cntrl:]]')),
  upi_qr_path    text check (upi_qr_path is null or upi_qr_path like restaurant_id::text || '/%'),
  accepts_cash   boolean not null default true,
  updated_at     timestamptz not null default now(),
  constraint payment_settings_has_a_way_to_pay
    check (accepts_cash or upi_id is not null or upi_qr_path is not null)
);

alter table public.restaurant_payment_settings enable row level security;
revoke all on public.restaurant_payment_settings from anon, authenticated;
grant select, insert, update on public.restaurant_payment_settings to authenticated;

create policy "owner reads payment settings" on public.restaurant_payment_settings
  for select to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_owner());
create policy "owner adds payment settings" on public.restaurant_payment_settings
  for insert to authenticated
  with check (restaurant_id = current_restaurant_id() and is_restaurant_owner());
create policy "owner edits payment settings" on public.restaurant_payment_settings
  for update to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_owner())
  with check (restaurant_id = current_restaurant_id() and is_restaurant_owner());

-- Café with no row yet = cash only, payee = café name.
create or replace function public.payment_options(p_restaurant_slug text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'upi_id',       s.upi_id,
    'payee_name',   coalesce(s.upi_payee_name, r.name),
    'qr_path',      s.upi_qr_path,
    'accepts_cash', coalesce(s.accepts_cash, true))
  from restaurants r
  left join restaurant_payment_settings s on s.restaurant_id = r.id
  where r.slug = p_restaurant_slug
$$;
revoke all on function public.payment_options(text) from public;
grant execute on function public.payment_options(text) to anon, authenticated;

-- 3. QR image bucket: public read, owner-only write -----------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qr', 'payment-qr', true, 1048576, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "owner sees payment qr" on storage.objects for select to authenticated
  using (bucket_id = 'payment-qr' and (storage.foldername(name))[1] = current_restaurant_id()::text and is_restaurant_owner());
create policy "owner adds payment qr" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-qr' and (storage.foldername(name))[1] = current_restaurant_id()::text and is_restaurant_owner());
create policy "owner deletes payment qr" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-qr' and (storage.foldername(name))[1] = current_restaurant_id()::text and is_restaurant_owner());

-- 4. Customer claim replaces the honor-system confirm_payment --------------
create or replace function public.claim_payment(p_session_id uuid, p_method text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rid uuid;
  v_opts json;
begin
  if p_method not in ('upi','cash') then raise exception 'bad payment method'; end if;

  select restaurant_id into v_rid from table_sessions
   where id = p_session_id and status <> 'closed' and payment_status in ('unpaid','claimed');
  if v_rid is null then return; end if;

  select json_build_object(
           'upi', (s.upi_id is not null or s.upi_qr_path is not null),
           'cash', coalesce(s.accepts_cash, true))
    into v_opts
    from restaurants r left join restaurant_payment_settings s on s.restaurant_id = r.id
   where r.id = v_rid;

  if (p_method = 'cash' and not (v_opts->>'cash')::boolean)
  or (p_method = 'upi'  and not (v_opts->>'upi')::boolean) then
    raise exception 'payment method not accepted here';
  end if;

  update table_sessions
     set payment_status = 'claimed', payment_method = p_method, bill_requested = true
   where id = p_session_id;
end $$;
revoke all on function public.claim_payment(uuid, text) from public;
grant execute on function public.claim_payment(uuid, text) to anon, authenticated;

drop function if exists public.confirm_payment(uuid);

-- 5. Customer view also returns payment_method ----------------------------
do $$
declare d text := pg_get_functiondef('public.get_customer_table_view(text,uuid)'::regprocedure);
begin
  if position('ts.payment_method' in d) = 0 then
    d := replace(d, 'ts.payment_status,', 'ts.payment_status, ts.payment_method,');
    if position('ts.payment_method' in d) = 0 then raise exception 'patch failed'; end if;
    execute d;
  end if;
end $$;