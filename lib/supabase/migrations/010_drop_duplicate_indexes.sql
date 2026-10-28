-- The live database has two copies of most indexes (the original *_idx ones and the idx_* ones
-- from the performance phase). Duplicates only slow down writes. Keep the original, drop the copy.
-- Safe: every dropped index has an identical twin that stays. Kept on purpose:
-- idx_orders_table_id and idx_orders_restaurant_id_created_at (no twins).
drop index if exists public.idx_menu_categories_restaurant_id;
drop index if exists public.idx_menu_item_addons_menu_item_id;
drop index if exists public.idx_menu_item_sizes_menu_item_id;
drop index if exists public.idx_menu_items_category_id;
drop index if exists public.idx_menu_items_restaurant_id;
drop index if exists public.idx_order_item_addons_order_item_id;
drop index if exists public.idx_order_items_order_id;
drop index if exists public.idx_orders_session_id;
drop index if exists public.idx_restaurant_tables_restaurant_id;
drop index if exists public.idx_restaurants_slug;           -- twin: the UNIQUE constraint restaurants_slug_key
drop index if exists public.idx_session_guests_session_id;
drop index if exists public.idx_staff_profiles_restaurant_id;
drop index if exists public.idx_table_sessions_restaurant_id;
drop index if exists public.idx_table_sessions_table_id_status;