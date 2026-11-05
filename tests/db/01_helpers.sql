-- Tiny test helpers. A failed check raises an error, which stops the run.

create schema t;
grant usage on schema t to public;

-- Fails unless the condition is true.
create function t.ok(label text, condition boolean) returns void
language plpgsql as $$
begin
  if condition is not true then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok   %', label;
end $$;

create function t.eq(label text, actual anyelement, expected anyelement) returns void
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAILED: % (got %, expected %)', label, actual, expected;
  end if;
  raise notice 'ok   %', label;
end $$;

-- Runs a statement as the current role and passes only if it fails with a
-- message matching the pattern (case-insensitive).
create function t.raises(label text, statement text, pattern text) returns void
language plpgsql as $$
declare msg text;
begin
  begin
    execute statement;
  exception when others then
    msg := sqlerrm;
  end;
  if msg is null then
    raise exception 'FAILED: % (it did not fail)', label;
  end if;
  if msg !~* pattern then
    raise exception 'FAILED: % (failed with "%", expected something like "%")', label, msg, pattern;
  end if;
  raise notice 'ok   %', label;
end $$;

-- Runs a statement as the current role and passes only if it succeeds.
create function t.works(label text, statement text) returns void
language plpgsql as $$
begin
  execute statement;
  raise notice 'ok   %', label;
exception when others then
  raise exception 'FAILED: % (error: %)', label, sqlerrm;
end $$;

-- Switch who is "calling": as_user('<uuid>') is a signed-in staff member.
create function t.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end $$;

-- An easy way to build a menu line list for place_order.
create function t.lines(item uuid, n int) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('menu_item_id', item, 'quantity', 1))
  from generate_series(1, n)
$$;

-- ---- Fixtures: build small cafés to test against (run as the database owner) ----

-- Empties every café and user, so each test file starts clean.
create function t.reset() returns void language plpgsql as $$
begin
  truncate public.restaurants cascade;
  delete from auth.users;
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- A café made with the real create_restaurant tool; returns the owner's user id.
create function t.make_cafe(p_slug text, p_email text) returns uuid language plpgsql as $$
declare uid uuid;
begin
  insert into auth.users (email) values (p_email) returning id into uid;
  perform public.create_restaurant(p_slug, initcap(p_slug), p_email, 0.05, '05:00', 10, 'CREATE ' || p_slug);
  return uid;
end $$;

-- A manager or staff member of a café; returns their user id.
create function t.add_staff(p_slug text, p_email text, p_role text) returns uuid language plpgsql as $$
declare uid uuid;
begin
  insert into auth.users (email) values (p_email) returning id into uid;
  insert into public.staff_profiles (id, restaurant_id, role)
  select uid, id, p_role from public.restaurants where slug = p_slug;
  return uid;
end $$;

create function t.make_item(p_slug text, p_name text, p_price numeric) returns uuid language plpgsql as $$
declare iid uuid;
begin
  insert into public.menu_items (restaurant_id, name, price)
  select id, p_name, p_price from public.restaurants where slug = p_slug
  returning id into iid;
  return iid;
end $$;

create function t.table_id(p_slug text, p_name text) returns uuid language sql as $$
  select rt.id from public.restaurant_tables rt
  join public.restaurants r on r.id = rt.restaurant_id
  where r.slug = p_slug and rt.name = p_name
$$;

create function t.restaurant_id(p_slug text) returns uuid language sql as $$
  select id from public.restaurants where slug = p_slug
$$;

-- What a guest does: place an order with n lines of one item (anyone can call this).
create function t.place(p_slug text, p_table uuid, p_guests int, p_item uuid, p_lines int, p_note text default null)
returns table (order_id uuid, order_number text, validation_code text)
language sql as $$
  select * from public.place_order(
    p_slug, p_table, p_guests,
    (select jsonb_agg(jsonb_build_object('menu_item_id', p_item, 'quantity', 1, 'note', p_note))
       from generate_series(1, p_lines)))
$$;

-- Runs an UPDATE/DELETE as the current role and says how many rows it changed.
-- (Row-level security hides other rows, so "0 changed" means it was blocked.)
create function t.rows_changed(statement text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end $$;