-- 019: only the owner can change café settings, and only what the Settings page offers.
--   * restaurants: staff keep READ access; only the owner can UPDATE, and only tax_rate.
--     Name, slug and day start can't be changed from the browser; nobody can insert or delete
--     a café from the browser (you do that in the SQL Editor / create_restaurant).
--   * set_day_start(time): the owner changes when the business day starts (00:00 to 08:00),
--     only while every table is closed. Safe to run twice.

-- 1. Policies -------------------------------------------------------------------------
drop policy if exists "staff manage own restaurant" on public.restaurants;
drop policy if exists "staff read own restaurant" on public.restaurants;
drop policy if exists "owner edits own restaurant" on public.restaurants;

create policy "staff read own restaurant" on public.restaurants
  for select to authenticated
  using (id = public.current_restaurant_id());

create policy "owner edits own restaurant" on public.restaurants
  for update to authenticated
  using (id = public.current_restaurant_id() and public.is_restaurant_owner())
  with check (id = public.current_restaurant_id() and public.is_restaurant_owner());

-- 2. Column-level limits (RLS alone can't say "only this column") ---------------------
revoke insert, update, delete on public.restaurants from authenticated;
grant update (tax_rate) on public.restaurants to authenticated;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_tax_rate_range') then
    alter table public.restaurants
      add constraint restaurants_tax_rate_range check (tax_rate >= 0 and tax_rate <= 0.3);
  end if;
end $$;

-- 3. Day start ------------------------------------------------------------------------
create or replace function public.set_day_start(p_time time)
 returns time
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rid uuid := public.current_restaurant_id();
begin
  if v_rid is null or not public.is_restaurant_owner() then
    raise exception 'Only the owner can change this';
  end if;
  if p_time is null or p_time < time '00:00' or p_time > time '08:00' then
    raise exception 'The business day must start between 00:00 and 08:00';
  end if;
  if exists (
    select 1 from public.table_sessions
    where restaurant_id = v_rid and status <> 'closed'
  ) then
    raise exception 'Close all open tables first, then change the day start';
  end if;

  update public.restaurants set day_start_time = p_time where id = v_rid;
  return p_time;
end
$function$;
revoke all on function public.set_day_start(time) from public, anon, authenticated;
grant execute on function public.set_day_start(time) to authenticated;