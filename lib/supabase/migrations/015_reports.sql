-- 015: Reports. Owner-only. Three functions, all scoped to the signed-in owner's café:
--   report_data(from, to)    one JSON with every number the Reports screen shows
--   report_orders(from, to)  one row per order (for the Orders CSV)
--   report_items(from, to)   one row per item sold (for the Items CSV)
-- "from" and "to" are business-day labels (see 013), both included, at most 92 days.
-- Sales = orders that are not cancelled and not "awaiting_validation" (same as History).
-- Paid = the order's table session is paid. Payment method comes from the session.

create or replace function public.report_range(p_from date, p_to date)
 returns table (rid uuid, tz text, day_start time, starts_at timestamptz, ends_at timestamptz)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_rid uuid := public.current_restaurant_id();
begin
  if v_rid is null or not public.is_restaurant_owner() then
    raise exception 'Reports are for the café owner only' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Pick a valid date range';
  end if;
  if p_to - p_from > 91 then
    raise exception 'Pick at most 92 days';
  end if;

  return query
    select r.id, r.timezone, r.day_start_time,
           (p_from + r.day_start_time) at time zone r.timezone,
           ((p_to + 1) + r.day_start_time) at time zone r.timezone
    from public.restaurants r
    where r.id = v_rid;
end
$function$;

-- Counted orders in the range, with their session's payment info and local time parts.
create or replace function public.report_base(p_from date, p_to date)
 returns table (
   id uuid, order_number text, created_at timestamptz, table_name text, source text,
   status text, subtotal numeric, tax numeric, total numeric,
   payment_status text, payment_method text, paid_local text,
   biz_day date, local_hour int, local_date date, local_time text
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select o.id, o.order_number, o.created_at, t.name, o.source,
         o.status, o.subtotal, o.tax, o.total,
         s.payment_status, s.payment_method,
         to_char(s.paid_at at time zone g.tz, 'YYYY-MM-DD HH24:MI'),
         ((o.created_at at time zone g.tz) - g.day_start::interval)::date,
         extract(hour from o.created_at at time zone g.tz)::int,
         (o.created_at at time zone g.tz)::date,
         to_char(o.created_at at time zone g.tz, 'HH24:MI')
  from public.report_range(p_from, p_to) g
  join public.orders o
    on o.restaurant_id = g.rid and o.created_at >= g.starts_at and o.created_at < g.ends_at
  left join public.restaurant_tables t on t.id = o.table_id
  left join public.table_sessions s on s.id = o.session_id
$function$;

create or replace function public.report_data(p_from date, p_to date)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_counted constant text[] := array['cancelled', 'awaiting_validation'];
  v jsonb;
begin
  perform 1 from public.report_range(p_from, p_to);

  with b as (select * from public.report_base(p_from, p_to)),
       c as (select * from b where status <> all (v_counted))
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'totals', (select jsonb_build_object(
        'orders', count(*),
        'sales', coalesce(sum(total), 0),
        'subtotal', coalesce(sum(subtotal), 0),
        'tax', coalesce(sum(tax), 0),
        'average', coalesce(round(avg(total)), 0),
        'paid', coalesce(sum(total) filter (where payment_status = 'paid'), 0),
        'unpaid', coalesce(sum(total) filter (where payment_status is distinct from 'paid'), 0),
        'cancelled', (select count(*) from b where status = 'cancelled'))
      from c),
    'by_payment', (select coalesce(jsonb_agg(x order by (x->>'sales')::numeric desc), '[]') from (
        select jsonb_build_object('method', coalesce(payment_method, 'not_recorded'),
                                  'orders', count(*), 'sales', sum(total)) x
        from c where payment_status = 'paid' group by payment_method) q),
    'by_source', (select coalesce(jsonb_agg(x order by x->>'source'), '[]') from (
        select jsonb_build_object('source', source, 'orders', count(*), 'sales', sum(total)) x
        from c group by source) q),
    'by_hour', (select coalesce(jsonb_agg(x order by (x->>'hour')::int), '[]') from (
        select jsonb_build_object('hour', local_hour, 'orders', count(*), 'sales', sum(total)) x
        from c group by local_hour) q),
    'by_day', (select coalesce(jsonb_agg(x order by x->>'day'), '[]') from (
        select jsonb_build_object('day', biz_day, 'orders', count(*), 'sales', sum(total)) x
        from c group by biz_day) q),
    'by_table', (select coalesce(jsonb_agg(x order by (x->>'sales')::numeric desc), '[]') from (
        select jsonb_build_object('table', coalesce(table_name, 'Unknown'), 'orders', count(*), 'sales', sum(total)) x
        from c group by table_name) q),
    'top_items', (select coalesce(jsonb_agg(x order by (x->>'sales')::numeric desc), '[]') from (
        select jsonb_build_object('name', i.name, 'quantity', sum(i.quantity), 'sales', sum(i.total_price)) x
        from c join public.order_items i on i.order_id = c.id
        group by i.name order by sum(i.total_price) desc, i.name limit 10) q)
  ) into v;

  return v;
end
$function$;

create or replace function public.report_orders(p_from date, p_to date)
 returns table (
   business_day date, date date, "time" text, order_number text, table_name text,
   placed_by text, status text, items text, subtotal numeric, tax numeric, total numeric,
   payment_status text, payment_method text, paid_at text
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select b.biz_day, b.local_date, b.local_time, b.order_number, b.table_name,
         case b.source when 'staff' then 'Staff' else 'Customer' end,
         b.status,
         (select string_agg(i.quantity || ' x ' || i.name, '; ' order by i.name)
            from public.order_items i where i.order_id = b.id),
         b.subtotal, b.tax, b.total,
         case b.payment_status when 'paid' then 'paid' else 'unpaid' end,
         case when b.payment_status = 'paid' then b.payment_method end,
         b.paid_local
  from public.report_base(p_from, p_to) b
  order by b.created_at, b.id
$function$;

create or replace function public.report_items(p_from date, p_to date)
 returns table (
   business_day date, date date, "time" text, order_number text, table_name text,
   status text, item text, size text, addons text, quantity int, unit_price numeric, total_price numeric
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select b.biz_day, b.local_date, b.local_time, b.order_number, b.table_name,
         b.status, i.name, i.size_name,
         (select string_agg(a.name, '; ' order by a.name)
            from public.order_item_addons a where a.order_item_id = i.id),
         i.quantity, i.unit_price, i.total_price
  from public.report_base(p_from, p_to) b
  join public.order_items i on i.order_id = b.id
  order by b.created_at, b.id, i.id
$function$;

-- Only signed-in staff can call these, and each one checks for the owner itself.
-- report_range and report_base are internal helpers: nobody calls them directly.
revoke all on function public.report_range(date, date) from public, anon, authenticated;
revoke all on function public.report_base(date, date) from public, anon, authenticated;
revoke all on function public.report_data(date, date) from public, anon, authenticated;
revoke all on function public.report_orders(date, date) from public, anon, authenticated;
revoke all on function public.report_items(date, date) from public, anon, authenticated;
grant execute on function public.report_data(date, date) to authenticated;
grant execute on function public.report_orders(date, date) to authenticated;
grant execute on function public.report_items(date, date) to authenticated;