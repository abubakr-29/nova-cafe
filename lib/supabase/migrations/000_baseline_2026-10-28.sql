-- NOVA café baseline schema. Rebuilt from the live-database snapshot taken 2026-10-28.
-- Folds in everything applied so far (original tables, RLS, indexes, phases 1-10, bookings, diet, staff orders, photos).
-- For a brand-new Supabase project: run this whole file once, then any migration numbered 010 or higher.
-- Assumes Supabase's default table privileges for anon/authenticated (not captured in the snapshot).

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============ TABLES ============
create table public.restaurants (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  name text not null,
  tax_rate numeric not null default 0.05,
  created_at timestamp with time zone not null default now()
);

create table public.staff_profiles (
  id uuid not null,
  restaurant_id uuid not null,
  full_name text,
  role text not null default 'staff'::text,
  created_at timestamp with time zone not null default now()
);

create table public.restaurant_tables (
  id uuid not null default gen_random_uuid(),
  restaurant_id uuid not null,
  name text not null,
  seats integer not null,
  shape text not null,
  status text not null default 'available'::text,
  position_x numeric not null,
  position_y numeric not null,
  position_width numeric not null,
  position_height numeric not null,
  created_at timestamp with time zone not null default now(),
  reservation_note text,
  reserved_for timestamp with time zone
);

create table public.menu_categories (
  id uuid not null default gen_random_uuid(),
  restaurant_id uuid not null,
  name text not null,
  sort_order integer not null default 0
);

create table public.menu_items (
  id uuid not null default gen_random_uuid(),
  restaurant_id uuid not null,
  category_id uuid,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  diet text
);

create table public.menu_item_sizes (
  id uuid not null default gen_random_uuid(),
  menu_item_id uuid not null,
  name text not null,
  price numeric not null default 0,
  sort_order integer not null default 0
);

create table public.menu_item_addons (
  id uuid not null default gen_random_uuid(),
  menu_item_id uuid not null,
  name text not null,
  price numeric not null default 0,
  sort_order integer not null default 0
);

create table public.table_sessions (
  id uuid not null default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  status text not null default 'open'::text,
  bill_requested boolean not null default false,
  payment_status text not null default 'unpaid'::text,
  started_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone
);

create table public.session_guests (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  name text not null,
  sort_order integer not null default 0
);

create table public.orders (
  id uuid not null default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  session_id uuid not null,
  order_number text not null,
  validation_code text not null,
  status text not null default 'awaiting_validation'::text,
  subtotal numeric not null,
  tax numeric not null,
  total numeric not null,
  created_at timestamp with time zone not null default now(),
  source text not null default 'customer'::text,
  placed_by uuid
);

create table public.order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  menu_item_id uuid,
  name text not null,
  image_url text,
  base_price numeric not null,
  size_name text,
  size_price numeric,
  note text,
  quantity integer not null,
  unit_price numeric not null,
  total_price numeric not null,
  assigned_guest_id uuid
);

create table public.order_item_addons (
  id uuid not null default gen_random_uuid(),
  order_item_id uuid not null,
  name text not null,
  price numeric not null
);

-- ============ CONSTRAINTS ============
alter table public.restaurants add constraint restaurants_pkey PRIMARY KEY (id);
alter table public.staff_profiles add constraint staff_profiles_pkey PRIMARY KEY (id);
alter table public.restaurant_tables add constraint restaurant_tables_pkey PRIMARY KEY (id);
alter table public.menu_categories add constraint menu_categories_pkey PRIMARY KEY (id);
alter table public.menu_items add constraint menu_items_pkey PRIMARY KEY (id);
alter table public.menu_item_sizes add constraint menu_item_sizes_pkey PRIMARY KEY (id);
alter table public.menu_item_addons add constraint menu_item_addons_pkey PRIMARY KEY (id);
alter table public.table_sessions add constraint table_sessions_pkey PRIMARY KEY (id);
alter table public.session_guests add constraint session_guests_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.order_items add constraint order_items_pkey PRIMARY KEY (id);
alter table public.order_item_addons add constraint order_item_addons_pkey PRIMARY KEY (id);
alter table public.restaurants add constraint restaurants_slug_key UNIQUE (slug);
alter table public.staff_profiles add constraint staff_profiles_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])));
alter table public.restaurant_tables add constraint restaurant_tables_shape_check CHECK ((shape = ANY (ARRAY['round'::text, 'square'::text, 'rectangle'::text])));
alter table public.restaurant_tables add constraint restaurant_tables_status_check CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text, 'attention'::text])));
alter table public.menu_items add constraint menu_items_diet_check CHECK (((diet IS NULL) OR (diet = ANY (ARRAY['veg'::text, 'non_veg'::text, 'egg'::text]))));
alter table public.table_sessions add constraint table_sessions_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text])));
alter table public.table_sessions add constraint table_sessions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'billing'::text, 'closed'::text])));
alter table public.orders add constraint orders_source_check CHECK ((source = ANY (ARRAY['customer'::text, 'staff'::text])));
alter table public.orders add constraint orders_status_check CHECK ((status = ANY (ARRAY['awaiting_validation'::text, 'pending'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'completed'::text, 'cancelled'::text])));
alter table public.order_items add constraint order_items_quantity_check CHECK (((quantity > 0) AND (quantity <= 20)));
alter table public.staff_profiles add constraint staff_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.staff_profiles add constraint staff_profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table public.restaurant_tables add constraint restaurant_tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table public.menu_categories add constraint menu_categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table public.menu_items add constraint menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL;
alter table public.menu_items add constraint menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table public.menu_item_sizes add constraint menu_item_sizes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
alter table public.menu_item_addons add constraint menu_item_addons_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
alter table public.table_sessions add constraint table_sessions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table public.table_sessions add constraint table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE;
alter table public.session_guests add constraint session_guests_session_id_fkey FOREIGN KEY (session_id) REFERENCES table_sessions(id) ON DELETE CASCADE;
alter table public.orders add constraint orders_placed_by_fkey FOREIGN KEY (placed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.orders add constraint orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table public.orders add constraint orders_session_id_fkey FOREIGN KEY (session_id) REFERENCES table_sessions(id) ON DELETE CASCADE;
alter table public.orders add constraint orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE;
alter table public.order_items add constraint order_items_assigned_guest_id_fkey FOREIGN KEY (assigned_guest_id) REFERENCES session_guests(id) ON DELETE SET NULL;
alter table public.order_items add constraint order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL;
alter table public.order_items add constraint order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public.order_item_addons add constraint order_item_addons_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;

-- ============ INDEXES ============
-- Note: many of these are duplicates of each other; 010_drop_duplicate_indexes.sql removes the extras.
CREATE INDEX idx_menu_categories_restaurant_id ON public.menu_categories USING btree (restaurant_id);
CREATE INDEX menu_categories_restaurant_id_idx ON public.menu_categories USING btree (restaurant_id);
CREATE INDEX idx_menu_item_addons_menu_item_id ON public.menu_item_addons USING btree (menu_item_id);
CREATE INDEX menu_item_addons_menu_item_id_idx ON public.menu_item_addons USING btree (menu_item_id);
CREATE INDEX idx_menu_item_sizes_menu_item_id ON public.menu_item_sizes USING btree (menu_item_id);
CREATE INDEX menu_item_sizes_menu_item_id_idx ON public.menu_item_sizes USING btree (menu_item_id);
CREATE INDEX idx_menu_items_category_id ON public.menu_items USING btree (category_id);
CREATE INDEX idx_menu_items_restaurant_id ON public.menu_items USING btree (restaurant_id);
CREATE INDEX menu_items_category_id_idx ON public.menu_items USING btree (category_id);
CREATE INDEX menu_items_restaurant_id_idx ON public.menu_items USING btree (restaurant_id);
CREATE INDEX idx_order_item_addons_order_item_id ON public.order_item_addons USING btree (order_item_id);
CREATE INDEX order_item_addons_order_item_id_idx ON public.order_item_addons USING btree (order_item_id);
CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);
CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);
CREATE INDEX idx_orders_restaurant_id_created_at ON public.orders USING btree (restaurant_id, created_at);
CREATE INDEX idx_orders_session_id ON public.orders USING btree (session_id);
CREATE INDEX idx_orders_table_id ON public.orders USING btree (table_id);
CREATE INDEX orders_restaurant_id_idx ON public.orders USING btree (restaurant_id);
CREATE INDEX orders_session_id_idx ON public.orders USING btree (session_id);
CREATE INDEX orders_status_idx ON public.orders USING btree (status);
CREATE INDEX idx_restaurant_tables_restaurant_id ON public.restaurant_tables USING btree (restaurant_id);
CREATE INDEX restaurant_tables_restaurant_id_idx ON public.restaurant_tables USING btree (restaurant_id);
CREATE UNIQUE INDEX idx_restaurants_slug ON public.restaurants USING btree (slug);
CREATE INDEX idx_session_guests_session_id ON public.session_guests USING btree (session_id);
CREATE INDEX session_guests_session_id_idx ON public.session_guests USING btree (session_id);
CREATE INDEX idx_staff_profiles_restaurant_id ON public.staff_profiles USING btree (restaurant_id);
CREATE INDEX staff_profiles_restaurant_id_idx ON public.staff_profiles USING btree (restaurant_id);
CREATE INDEX idx_table_sessions_restaurant_id ON public.table_sessions USING btree (restaurant_id);
CREATE INDEX idx_table_sessions_table_id_status ON public.table_sessions USING btree (table_id, status);
CREATE INDEX table_sessions_restaurant_id_idx ON public.table_sessions USING btree (restaurant_id);
CREATE INDEX table_sessions_table_id_status_idx ON public.table_sessions USING btree (table_id, status);

-- ============ ROW LEVEL SECURITY ============
alter table public.menu_categories enable row level security;
alter table public.menu_item_addons enable row level security;
alter table public.menu_item_sizes enable row level security;
alter table public.menu_items enable row level security;
alter table public.order_item_addons enable row level security;
alter table public.order_items enable row level security;
alter table public.orders enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurants enable row level security;
alter table public.session_guests enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.table_sessions enable row level security;

-- ============ FUNCTIONS (exact live text) ============

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
 update public.orders
 set status = 'cancelled'
 where id = p_order_id and status = 'awaiting_validation';
$function$;


CREATE OR REPLACE FUNCTION public.confirm_payment(p_session_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
 update public.table_sessions
 set payment_status = 'paid'
 where id = p_session_id and status <> 'closed';
$function$;


CREATE OR REPLACE FUNCTION public.current_restaurant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
 select restaurant_id from public.staff_profiles where id = auth.uid()
$function$;


CREATE OR REPLACE FUNCTION public.get_customer_table_view(p_restaurant_slug text, p_table_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_restaurant_id uuid;
 v_session_id uuid;
begin
 select id into v_restaurant_id
 from restaurants
 where slug = p_restaurant_slug;

 if v_restaurant_id is null then
 return json_build_object('table', null, 'session', null, 'orders', '[]'::json);
 end if;

 select ts.id into v_session_id
 from table_sessions ts
 where ts.table_id = p_table_id
 and ts.restaurant_id = v_restaurant_id
 and ts.status <> 'closed'
 limit 1;

 return json_build_object(
 'table', (
 select row_to_json(t) from (
 select id, name, seats, shape, status,
 position_x, position_y, position_width, position_height,
 -- true while a booking's hold window is active (30 min before
 -- to 30 min after the booking time)
 (reserved_for is not null
 and now() between reserved_for - interval '30 minutes'
 and reserved_for + interval '30 minutes') as on_hold
 from restaurant_tables
 where id = p_table_id and restaurant_id = v_restaurant_id
 ) t
 ),
 'session', (
 select row_to_json(s) from (
 select
 ts.id,
 ts.table_id,
 ts.status,
 ts.bill_requested,
 ts.payment_status,
 ts.started_at,
 (select rt.name from restaurant_tables rt where rt.id = ts.table_id) as table_name,
 (
 select coalesce(json_agg(
 json_build_object('id', g.id, 'name', g.name, 'sort_order', g.sort_order)
 order by g.sort_order
 ), '[]'::json)
 from session_guests g
 where g.session_id = ts.id
 ) as guests,
 (
 select coalesce(json_agg(json_build_object('id', o.id)), '[]'::json)
 from orders o
 where o.session_id = ts.id
 ) as orders
 from table_sessions ts
 where ts.id = v_session_id
 ) s
 ),
 -- Scoped to the CURRENT open session only — not "this table's orders
 -- ever", so a new party seated at the same table can't see a
 -- previous party's order history either.
 'orders', (
 select coalesce(json_agg(row_to_json(o) order by o.created_at), '[]'::json)
 from (
 select
 ord.id,
 ord.order_number,
 ord.validation_code,
 ord.table_id,
 ord.status,
 ord.subtotal,
 ord.tax,
 ord.total,
 ord.created_at,
 (select rt.name from restaurant_tables rt where rt.id = ord.table_id) as table_name,
 (
 select coalesce(json_agg(json_build_object(
 'id', oi.id,
 'menu_item_id', oi.menu_item_id,
 'name', oi.name,
 'image_url', oi.image_url,
 'base_price', oi.base_price,
 'size_name', oi.size_name,
 'size_price', oi.size_price,
 'note', oi.note,
 'quantity', oi.quantity,
 'unit_price', oi.unit_price,
 'total_price', oi.total_price,
 'assigned_guest_id', oi.assigned_guest_id,
 'order_item_addons', (
 select coalesce(json_agg(json_build_object('name', a.name, 'price', a.price)), '[]'::json)
 from order_item_addons a
 where a.order_item_id = oi.id
 )
 )), '[]'::json)
 from order_items oi
 where oi.order_id = ord.id
 ) as order_items
 from orders ord
 where ord.session_id = v_session_id
 ) o
 )
 );
end;
$function$;


CREATE OR REPLACE FUNCTION public.import_menu(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_restaurant_id uuid := public.current_restaurant_id();
 v_row jsonb;
 v_size jsonb;
 v_idx int := 0;
 v_category text;
 v_name text;
 v_description text;
 v_image_url text;
 v_diet text;
 v_price numeric;
 v_available boolean;
 v_size_name text;
 v_size_price numeric;
 v_size_order int;
 v_seen_sizes text[];
 v_cat_id uuid;
 v_item_id uuid;
 v_next_category_order int;
 v_next_item_order int;
 v_new_categories int := 0;
 v_new_items int := 0;
 v_skipped int := 0;
begin
 if v_restaurant_id is null then
 raise exception 'This account is not linked to a restaurant';
 end if;

 if p_items is null or jsonb_typeof(p_items) <> 'array' then
 raise exception 'Expected a list of menu items';
 end if;

 if jsonb_array_length(p_items) = 0 then
 raise exception 'There is nothing to import';
 end if;

 if jsonb_array_length(p_items) > 1000 then
 raise exception 'Too many items in one import (the limit is 1000)';
 end if;

 -- One import at a time per restaurant, so two clicks can't interleave.
 perform pg_advisory_xact_lock(hashtext('import_menu:' || v_restaurant_id::text));

 select coalesce(max(sort_order), 0) + 1 into v_next_category_order
 from public.menu_categories where restaurant_id = v_restaurant_id;

 select coalesce(max(sort_order), 0) + 1 into v_next_item_order
 from public.menu_items where restaurant_id = v_restaurant_id;

 for v_row in select * from jsonb_array_elements(p_items)
 loop
 v_idx := v_idx + 1;

 v_category := nullif(btrim(v_row ->> 'category'), '');
 v_name := nullif(btrim(v_row ->> 'name'), '');
 v_description := nullif(btrim(v_row ->> 'description'), '');
 v_image_url := nullif(btrim(v_row ->> 'image_url'), '');
 v_diet := nullif(btrim(v_row ->> 'diet'), '');

 if v_category is null or char_length(v_category) > 80 then
 raise exception 'Item %: the category is missing or too long', v_idx;
 end if;
 if v_name is null or char_length(v_name) > 150 then
 raise exception 'Item %: the name is missing or too long', v_idx;
 end if;
 if v_description is not null and char_length(v_description) > 500 then
 raise exception 'Item % (%): the description is too long', v_idx, v_name;
 end if;
 if v_image_url is not null and char_length(v_image_url) > 500 then
 raise exception 'Item % (%): the image link is too long', v_idx, v_name;
 end if;
 if v_diet is not null and v_diet not in ('veg', 'non_veg', 'egg') then
 raise exception 'Item % (%): diet must be veg, non_veg or egg', v_idx, v_name;
 end if;

 begin
 v_price := (v_row ->> 'price')::numeric;
 exception when others then
 raise exception 'Item % (%): the price is not a number', v_idx, v_name;
 end;
 if v_price is null or v_price < 0 or v_price > 1000000 then
 raise exception 'Item % (%): the price must be between 0 and 1,000,000', v_idx, v_name;
 end if;

 begin
 v_available := coalesce((v_row ->> 'available')::boolean, true);
 exception when others then
 raise exception 'Item % (%): available must be true or false', v_idx, v_name;
 end;

 -- Find the category (case-insensitive) or create it.
 select id into v_cat_id
 from public.menu_categories
 where restaurant_id = v_restaurant_id
 and lower(name) = lower(v_category)
 order by sort_order
 limit 1;

 if v_cat_id is null then
 insert into public.menu_categories (restaurant_id, name, sort_order)
 values (v_restaurant_id, v_category, v_next_category_order)
 returning id into v_cat_id;

 v_next_category_order := v_next_category_order + 1;
 v_new_categories := v_new_categories + 1;
 end if;

 -- Already on the menu? Leave it alone (this makes re-importing safe).
 if exists (
 select 1 from public.menu_items
 where restaurant_id = v_restaurant_id
 and category_id = v_cat_id
 and lower(name) = lower(v_name)
 ) then
 v_skipped := v_skipped + 1;
 continue;
 end if;

 insert into public.menu_items (
 restaurant_id, category_id, name, description, price,
 image_url, available, diet, sort_order
 ) values (
 v_restaurant_id, v_cat_id, v_name, v_description, v_price,
 v_image_url, v_available, v_diet, v_next_item_order
 )
 returning id into v_item_id;

 v_next_item_order := v_next_item_order + 1;
 v_new_items := v_new_items + 1;

 -- Sizes: each price is an EXTRA on top of the item's base price.
 if jsonb_typeof(v_row -> 'sizes') = 'array' then
 if jsonb_array_length(v_row -> 'sizes') > 10 then
 raise exception 'Item % (%): too many sizes (max 10)', v_idx, v_name;
 end if;

 v_size_order := 0;
 v_seen_sizes := array[]::text[];

 for v_size in select * from jsonb_array_elements(v_row -> 'sizes')
 loop
 v_size_name := nullif(btrim(v_size ->> 'name'), '');

 if v_size_name is null or char_length(v_size_name) > 60 then
 raise exception 'Item % (%): a size name is missing or too long', v_idx, v_name;
 end if;
 if lower(v_size_name) = any (v_seen_sizes) then
 raise exception 'Item % (%): two sizes are both called %', v_idx, v_name, v_size_name;
 end if;
 v_seen_sizes := v_seen_sizes || lower(v_size_name);

 begin
 v_size_price := (v_size ->> 'price')::numeric;
 exception when others then
 raise exception 'Item % (%): a size price is not a number', v_idx, v_name;
 end;
 if v_size_price is null or v_size_price < 0 or v_size_price > 1000000 then
 raise exception 'Item % (%): a size price must be between 0 and 1,000,000', v_idx, v_name;
 end if;

 v_size_order := v_size_order + 1;

 insert into public.menu_item_sizes (menu_item_id, name, price, sort_order)
 values (v_item_id, v_size_name, v_size_price, v_size_order);
 end loop;
 end if;
 end loop;

 return jsonb_build_object(
 'new_categories', v_new_categories,
 'new_items', v_new_items,
 'skipped_existing', v_skipped
 );
end;
$function$;


CREATE OR REPLACE FUNCTION public.is_restaurant_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
 select exists (
 select 1 from public.staff_profiles
 where id = auth.uid() and role = 'owner'
 )
$function$;


CREATE OR REPLACE FUNCTION public.menu_item_popularity(p_days integer DEFAULT 90)
 RETURNS TABLE(menu_item_id uuid, total_quantity bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select oi.menu_item_id, sum(oi.quantity)::bigint as total_quantity
 from public.order_items oi
 join public.orders o on o.id = oi.order_id
 where o.restaurant_id = public.current_restaurant_id()
 and o.created_at >= now() - make_interval(days => greatest(least(coalesce(p_days, 90), 365), 1))
 and o.status <> 'cancelled'
 and oi.menu_item_id is not null
 group by oi.menu_item_id
 order by total_quantity desc, oi.menu_item_id;
$function$;


CREATE OR REPLACE FUNCTION public.place_order(p_restaurant_slug text, p_table_id uuid, p_guest_count integer, p_items jsonb)
 RETURNS TABLE(order_id uuid, order_number text, validation_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION public.request_bill(p_session_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
 update public.table_sessions
 set bill_requested = true
 where id = p_session_id and status <> 'closed';
$function$;


CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
 cmd record;
BEGIN
 FOR cmd IN
 SELECT *
 FROM pg_event_trigger_ddl_commands()
 WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
 AND object_type IN ('table','partitioned table')
 LOOP
 IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
 BEGIN
 EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
 RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
 EXCEPTION
 WHEN OTHERS THEN
 RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
 END;
 ELSE
 RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
 END IF;
 END LOOP;
END;
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
 v_order_number text := to_char(now(), 'HH24MISS') || lpad(floor(random() * 100)::text, 2, '0');
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

 insert into public.orders (
 id, restaurant_id, table_id, session_id, order_number, validation_code,
 status, subtotal, tax, total, source, placed_by
 ) values (
 v_order_id, v_restaurant_id, p_table_id, v_session_id, v_order_number, 'STAFF',
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

-- ============ WHO MAY RUN EACH FUNCTION ============
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order(uuid) to anon;
grant execute on function public.cancel_order(uuid) to authenticated;
revoke all on function public.confirm_payment(uuid) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid) to anon;
grant execute on function public.confirm_payment(uuid) to authenticated;
revoke all on function public.current_restaurant_id() from public, anon, authenticated;
grant execute on function public.current_restaurant_id() to anon;
grant execute on function public.current_restaurant_id() to authenticated;
revoke all on function public.get_customer_table_view(text, uuid) from public, anon, authenticated;
grant execute on function public.get_customer_table_view(text, uuid) to anon;
grant execute on function public.get_customer_table_view(text, uuid) to authenticated;
revoke all on function public.import_menu(jsonb) from public, anon, authenticated;
grant execute on function public.import_menu(jsonb) to authenticated;
revoke all on function public.is_restaurant_owner() from public, anon, authenticated;
grant execute on function public.is_restaurant_owner() to anon;
grant execute on function public.is_restaurant_owner() to authenticated;
revoke all on function public.menu_item_popularity(integer) from public, anon, authenticated;
grant execute on function public.menu_item_popularity(integer) to authenticated;
revoke all on function public.place_order(text, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text, uuid, integer, jsonb) to anon;
grant execute on function public.place_order(text, uuid, integer, jsonb) to authenticated;
revoke all on function public.request_bill(uuid) from public, anon, authenticated;
grant execute on function public.request_bill(uuid) to anon;
grant execute on function public.request_bill(uuid) to authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to anon;
grant execute on function public.rls_auto_enable() to authenticated;
revoke all on function public.staff_place_order(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.staff_place_order(uuid, integer, jsonb) to authenticated;

-- ============ POLICIES ============
create policy "anyone can read menu categories" on public.menu_categories as permissive for select to anon
  using (true);
create policy "staff manage own menu categories" on public.menu_categories as permissive for all to authenticated
  using ((restaurant_id = current_restaurant_id()))
  with check ((restaurant_id = current_restaurant_id()));
create policy "anyone can read menu item addons" on public.menu_item_addons as permissive for select to anon
  using (true);
create policy "staff manage own menu item addons" on public.menu_item_addons as permissive for all to authenticated
  using ((menu_item_id IN ( SELECT menu_items.id  FROM menu_items  WHERE (menu_items.restaurant_id = current_restaurant_id()))));
create policy "anyone can read menu item sizes" on public.menu_item_sizes as permissive for select to anon
  using (true);
create policy "staff manage own menu item sizes" on public.menu_item_sizes as permissive for all to authenticated
  using ((menu_item_id IN ( SELECT menu_items.id  FROM menu_items  WHERE (menu_items.restaurant_id = current_restaurant_id()))));
create policy "anyone can read menu items" on public.menu_items as permissive for select to anon
  using (true);
create policy "staff manage own menu items" on public.menu_items as permissive for all to authenticated
  using ((restaurant_id = current_restaurant_id()))
  with check ((restaurant_id = current_restaurant_id()));
create policy "staff manage own order item addons" on public.order_item_addons as permissive for all to authenticated
  using ((order_item_id IN ( SELECT oi.id  FROM (order_items oi  JOIN orders o ON ((o.id = oi.order_id)))  WHERE (o.restaurant_id = current_restaurant_id()))));
create policy "staff manage own order items" on public.order_items as permissive for all to authenticated
  using ((order_id IN ( SELECT orders.id  FROM orders  WHERE (orders.restaurant_id = current_restaurant_id()))));
create policy "staff manage own orders" on public.orders as permissive for all to authenticated
  using ((restaurant_id = current_restaurant_id()))
  with check ((restaurant_id = current_restaurant_id()));
create policy "staff manage own tables" on public.restaurant_tables as permissive for all to authenticated
  using ((restaurant_id = current_restaurant_id()))
  with check ((restaurant_id = current_restaurant_id()));
create policy "anyone can read restaurants" on public.restaurants as permissive for select to anon
  using (true);
create policy "staff manage own restaurant" on public.restaurants as permissive for all to authenticated
  using ((id = current_restaurant_id()))
  with check ((id = current_restaurant_id()));
create policy "staff manage own session guests" on public.session_guests as permissive for all to authenticated
  using ((session_id IN ( SELECT table_sessions.id  FROM table_sessions  WHERE (table_sessions.restaurant_id = current_restaurant_id()))));
create policy "owners can view restaurant staff" on public.staff_profiles as permissive for select to authenticated
  using (((restaurant_id = current_restaurant_id()) AND is_restaurant_owner()));
create policy "staff read own profile" on public.staff_profiles as permissive for select to authenticated
  using ((id = auth.uid()));
create policy "staff manage own sessions" on public.table_sessions as permissive for all to authenticated
  using ((restaurant_id = current_restaurant_id()))
  with check ((restaurant_id = current_restaurant_id()));
create policy "staff add own menu images" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'menu-images'::text) AND ((storage.foldername(name))[1] = (current_restaurant_id())::text)));
create policy "staff delete own menu images" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'menu-images'::text) AND ((storage.foldername(name))[1] = (current_restaurant_id())::text)));
create policy "staff replace own menu images" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'menu-images'::text) AND ((storage.foldername(name))[1] = (current_restaurant_id())::text)))
  with check (((bucket_id = 'menu-images'::text) AND ((storage.foldername(name))[1] = (current_restaurant_id())::text)));
create policy "staff see own menu images" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'menu-images'::text) AND ((storage.foldername(name))[1] = (current_restaurant_id())::text)));

-- ============ LIVE UPDATES (Realtime) ============
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.order_item_addons;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.restaurant_tables;
alter publication supabase_realtime add table public.restaurants;
alter publication supabase_realtime add table public.session_guests;
alter publication supabase_realtime add table public.table_sessions;

-- ============ PHOTO BUCKET ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 1048576, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;