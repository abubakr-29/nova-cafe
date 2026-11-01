-- 018: café creation tool for YOU (SQL Editor / service key). Owners, staff and guests cannot call it.
--
-- Steps for a new café:
--   1. Supabase dashboard > Authentication > Users > "Add user": the owner's email + a password
--      (tick "Auto Confirm User").
--   2. Look (creates nothing):
--        select public.create_restaurant('blue-door', 'Blue Door Café', 'owner@example.com');
--      Optional extras: p_tax_rate => 0.05 (a fraction: 5% is 0.05), p_day_start => '05:00',
--      p_table_count => 10 (1 to 32).
--   3. Do it (the phrase is 'CREATE ' + the slug):
--        select public.create_restaurant('blue-door', 'Blue Door Café', 'owner@example.com',
--                                        p_confirm => 'CREATE blue-door');
--
-- It creates: the café, the owner's staff profile (role owner), the billing row (active),
-- and starter tables "Table 1".."Table N" (4 seats, square) on the floor-map grid.
-- It does NOT create a menu, photos or UPI details: the owner adds those (see
-- docs/new-cafe-checklist.md). One café per owner account; a second call for the same
-- slug or owner is refused.

create or replace function public.create_restaurant(
  p_slug text,
  p_name text,
  p_owner_email text,
  p_tax_rate numeric default 0.05,
  p_day_start time default '05:00',
  p_table_count int default 10,
  p_confirm text default null
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_apply boolean := p_confirm is not distinct from ('CREATE ' || p_slug);
  v_owner uuid;
  v_rid uuid := gen_random_uuid();
  v_site text := 'https://tavro.famedia.co.in';
begin
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) not between 2 and 40 then
    raise exception 'Slug must be 2 to 40 characters: lowercase letters, digits and single hyphens (e.g. blue-door)';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Name must be 1 to 80 characters';
  end if;
  if p_tax_rate is null or p_tax_rate < 0 or p_tax_rate > 0.3 then
    raise exception 'Tax rate is a fraction between 0 and 0.3 (5%% is 0.05)';
  end if;
  if p_day_start is null then
    raise exception 'Day start time is required (e.g. ''05:00'')';
  end if;
  if p_table_count is null or p_table_count not between 1 and 32 then
    raise exception 'Table count must be 1 to 32 (the floor-map grid holds 32; the owner can add more later)';
  end if;
  if exists (select 1 from public.restaurants where slug = p_slug) then
    raise exception 'A café with slug % already exists', p_slug;
  end if;

  select id into v_owner from auth.users
   where lower(email) = lower(btrim(p_owner_email))
   limit 1;
  if v_owner is null then
    raise exception 'No auth user with email %. Create it first: Authentication > Users > Add user', p_owner_email;
  end if;
  if exists (select 1 from public.staff_profiles where id = v_owner) then
    raise exception 'That user already belongs to a café';
  end if;

  if v_apply then
    insert into public.restaurants (id, slug, name, tax_rate, day_start_time)
    values (v_rid, p_slug, btrim(p_name), p_tax_rate, p_day_start);

    insert into public.staff_profiles (id, restaurant_id, role)
    values (v_owner, v_rid, 'owner');

    insert into public.restaurant_billing (restaurant_id, status)
    values (v_rid, 'active');

    -- Same grid as lib/table-layout.ts: 8 columns, 8-wide, 11-high tiles.
    insert into public.restaurant_tables
      (restaurant_id, name, seats, shape, status, position_x, position_y, position_width, position_height)
    select v_rid, 'Table ' || n, 4, 'square', 'available',
           6 + ((n - 1) % 8) * 11, 13 + ((n - 1) / 8) * 16, 8, 11
      from generate_series(1, p_table_count) n;
  end if;

  return jsonb_build_object(
    'mode', case when v_apply then 'CREATED' else 'DRY RUN, nothing created' end,
    'slug', p_slug,
    'name', btrim(p_name),
    'owner_email', lower(btrim(p_owner_email)),
    'tax_rate', p_tax_rate,
    'day_start', p_day_start,
    'tables', p_table_count,
    'login_url', v_site || '/login',
    'public_menu_url', v_site || '/menu/' || p_slug,
    'next', case when v_apply
                 then 'Now follow docs/new-cafe-checklist.md (UPI, menu, photos, QR sheet).'
                 else 'To create it, add: p_confirm => ''CREATE ' || p_slug || '''' end);
end
$function$;

revoke all on function public.create_restaurant(text, text, text, numeric, time, int, text)
  from public, anon, authenticated;
grant execute on function public.create_restaurant(text, text, text, numeric, time, int, text)
  to service_role;