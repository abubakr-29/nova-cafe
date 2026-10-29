-- 016: cleanup tools for YOU (SQL Editor / service key). Customers and staff cannot call them.
--
-- 1) reset_test_data(slug, before, confirm)
--    Wipes the test orders of ONE café before it goes live. Keeps the menu, tables, staff,
--    settings, payment settings and billing switch. Safe by default: it only COUNTS what it
--    would delete until you pass the exact confirm phrase.
--
--    Step 1, look (deletes nothing):
--      select public.reset_test_data('white-cave', now());
--    Step 2, do it (the phrase is 'RESET ' + the slug):
--      select public.reset_test_data('white-cave', now(), 'RESET white-cave');
--
--    "before" is a moment: everything that STARTED before it is deleted (sessions, their
--    guests, orders, order items). Use now() right before you open to real customers. It
--    refuses a moment in the future.
--
-- 2) menu_photo_references(slug)
--    The photo files still in use (used by scripts/clean-unused-photos.mjs).

create or replace function public.reset_test_data(
  p_slug text,
  p_before timestamptz,
  p_confirm text default null
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rid uuid;
  v_apply boolean := p_confirm is not distinct from ('RESET ' || p_slug);
  v_sessions int;
  v_guests int;
  v_orders int;
  v_items int;
  v_newest timestamptz;
  v_open_kept int;
begin
  if p_before is null or p_before > now() then
    raise exception 'Give a moment that is not in the future, e.g. now()';
  end if;

  select id into v_rid from public.restaurants where slug = p_slug;
  if v_rid is null then
    raise exception 'No café with slug %', p_slug;
  end if;

  select count(*) into v_sessions from public.table_sessions
   where restaurant_id = v_rid and started_at < p_before;

  select count(*) into v_guests from public.session_guests g
   join public.table_sessions s on s.id = g.session_id
   where s.restaurant_id = v_rid and s.started_at < p_before;

  select count(*), max(o.created_at) into v_orders, v_newest from public.orders o
   join public.table_sessions s on s.id = o.session_id
   where s.restaurant_id = v_rid and s.started_at < p_before;

  select count(*) into v_items from public.order_items i
   join public.orders o on o.id = i.order_id
   join public.table_sessions s on s.id = o.session_id
   where s.restaurant_id = v_rid and s.started_at < p_before;

  select count(*) into v_open_kept from public.table_sessions
   where restaurant_id = v_rid and started_at >= p_before and status <> 'closed';

  if v_apply then
    -- Orders, order items, add-ons and guests go with their session (ON DELETE CASCADE).
    delete from public.table_sessions
     where restaurant_id = v_rid and started_at < p_before;

    -- A table that showed "in use" but has no open session any more is free again.
    update public.restaurant_tables t
       set status = 'available'
     where t.restaurant_id = v_rid
       and t.status in ('occupied', 'attention')
       and not exists (
         select 1 from public.table_sessions s
          where s.table_id = t.id and s.status <> 'closed');
  end if;

  return jsonb_build_object(
    'cafe', p_slug,
    'mode', case when v_apply then 'DELETED' else 'DRY RUN, nothing deleted' end,
    'sessions', v_sessions,
    'guests', v_guests,
    'orders', v_orders,
    'order_items', v_items,
    'newest_order_affected', v_newest,
    'open_tables_kept', v_open_kept,
    'next', case when v_apply then null
                 else 'To delete, add the third argument: ''RESET ' || p_slug || '''' end);
end
$function$;

create or replace function public.menu_photo_references(p_slug text)
 returns setof text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  -- Photos on the menu now, plus photos shown on bills of tables that are still open.
  with urls as (
    select m.image_url as url
      from public.menu_items m
      join public.restaurants r on r.id = m.restaurant_id
     where r.slug = p_slug and m.image_url is not null
    union
    select i.image_url
      from public.order_items i
      join public.orders o on o.id = i.order_id
      join public.table_sessions s on s.id = o.session_id
      join public.restaurants r on r.id = s.restaurant_id
     where r.slug = p_slug and s.status <> 'closed' and i.image_url is not null
  )
  select substring(url from '/menu-images/([^?]+)')
    from urls
   where url like '%/menu-images/%'
$function$;

revoke all on function public.reset_test_data(text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.menu_photo_references(text) from public, anon, authenticated;
grant execute on function public.reset_test_data(text, timestamptz, text) to service_role;
grant execute on function public.menu_photo_references(text) to service_role;