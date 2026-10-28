-- 013: the "business day". A café's day does not end at midnight: an order at 1 am still
-- belongs to the evening before. Each café gets a timezone and a day start time; one
-- function turns that into exact start/end moments so the dashboard, history and (later)
-- reports all agree on what "today" means.
--
-- Defaults: Asia/Kolkata, day starts 05:00. To change a café (SQL Editor):
--   update public.restaurants set timezone = 'Asia/Kolkata', day_start_time = '04:00'
--   where slug = 'white-cave';

alter table public.restaurants
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists day_start_time time not null default '05:00';

-- business_day_bounds()        -> the café's CURRENT business day
-- business_day_bounds('2026-10-27') -> that business day (a date label, e.g. for History)
-- Returns one row: day (the date label), starts_at, ends_at (24 h later, DST-safe).
-- Works only for the signed-in staff member's own café.
create or replace function public.business_day_bounds(p_day date default null)
 returns table (day date, starts_at timestamptz, ends_at timestamptz)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with r as (
    select timezone, day_start_time
    from public.restaurants
    where id = public.current_restaurant_id()
  ),
  d as (
    select
      coalesce(
        p_day,
        ((now() at time zone r.timezone) - r.day_start_time::interval)::date
      ) as day,
      r.timezone,
      r.day_start_time
    from r
  )
  select
    d.day,
    (d.day + d.day_start_time) at time zone d.timezone,
    ((d.day + 1) + d.day_start_time) at time zone d.timezone
  from d
$function$;

revoke all on function public.business_day_bounds(date) from public, anon, authenticated;
grant execute on function public.business_day_bounds(date) to authenticated;
