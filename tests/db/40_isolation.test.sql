-- Cafés must never see each other's data, guests must never see private data,
-- and money settings and reports belong to the owner alone.

select t.reset();
select t.make_cafe('cafe-a', 'oa@example.com') as owner_a \gset
select t.add_staff('cafe-a', 'ma@example.com', 'manager') as manager_a \gset
select t.add_staff('cafe-a', 'wa@example.com', 'staff') as staff_a \gset
select t.make_cafe('cafe-b', 'ob@example.com') as owner_b \gset
select t.make_item('cafe-a', 'Tea A', 100) as tea_a \gset
select t.make_item('cafe-b', 'Tea B', 100) as tea_b \gset
select t.table_id('cafe-a', 'Table 1') as a1, t.table_id('cafe-b', 'Table 1') as b1 \gset

set role anon;
select t.place('cafe-a', :'a1', 2, :'tea_a', 1);
select t.place('cafe-b', :'b1', 2, :'tea_b', 1);
reset role;
select id as order_a from orders where restaurant_id = t.restaurant_id('cafe-a') \gset
select id as order_b from orders where restaurant_id = t.restaurant_id('cafe-b') \gset
select id as session_a from table_sessions where restaurant_id = t.restaurant_id('cafe-a') \gset

-- ---- guests (not signed in) ----
set role anon;
select t.eq('guests cannot read orders', (select count(*) from orders), 0::bigint);
select t.eq('guests cannot read order lines', (select count(*) from order_items), 0::bigint);
select t.eq('guests cannot read table sessions', (select count(*) from table_sessions), 0::bigint);
select t.eq('guests cannot read who the guests are', (select count(*) from session_guests), 0::bigint);
select t.eq('guests cannot read staff accounts', (select count(*) from staff_profiles), 0::bigint);
select t.raises('guests cannot read payment settings', 'select * from restaurant_payment_settings', 'permission denied');
select t.raises('guests cannot read billing status', 'select * from restaurant_billing', 'permission denied');
select t.eq('guests CAN read menu items (the public menu)', (select count(*) from menu_items), 2::bigint);
select t.eq('guests cannot change a menu item',
  t.rows_changed($q$update menu_items set price = 1$q$), 0::bigint);
select t.eq('guests cannot cancel orders directly',
  t.rows_changed($q$update orders set status = 'cancelled'$q$), 0::bigint);
select t.raises('guests cannot call the cleanup tool',
  $q$select reset_test_data('cafe-a', now())$q$, 'permission denied');
reset role;

-- ---- staff of café A ----
select t.as_user(:'staff_a');
set role authenticated;
select t.eq('staff see their own café''s orders', (select count(*) from orders), 1::bigint);
select t.eq('staff cannot see the other café''s orders',
  (select count(*) from orders where restaurant_id = t.restaurant_id('cafe-b')), 0::bigint);
select t.eq('staff see only their own tables', (select count(distinct restaurant_id) from restaurant_tables), 1::bigint);
select t.eq('staff can update their own café''s orders',
  t.rows_changed(format($q$update orders set status = 'confirmed' where id = %L$q$, :'order_a')), 1::bigint);
select t.eq('staff cannot update the other café''s orders',
  t.rows_changed(format($q$update orders set status = 'cancelled' where id = %L$q$, :'order_b')), 0::bigint);
select t.raises('staff cannot add a menu item to the other café',
  format($q$insert into menu_items (restaurant_id, name, price) values (%L, 'hack', 1)$q$, t.restaurant_id('cafe-b')),
  'row-level security');
select t.eq('staff cannot read the other café''s payment settings',
  (select count(*) from restaurant_payment_settings where restaurant_id = t.restaurant_id('cafe-b')), 0::bigint);
reset role;

-- ---- owner-only: payment settings and reports ----
select t.as_user(:'manager_a');
set role authenticated;
select t.eq('a manager cannot read payment settings', (select count(*) from restaurant_payment_settings), 0::bigint);
select t.raises('a manager cannot set the UPI id',
  $q$insert into restaurant_payment_settings (restaurant_id, upi_id) values (current_restaurant_id(), 'a@bc')$q$,
  'row-level security');
select t.raises('a manager cannot read the reports',
  $q$select * from report_data(current_date - 1, current_date)$q$, 'owner only');
reset role;

select t.as_user(:'owner_a');
set role authenticated;
select t.works('the owner can set the UPI id',
  $q$insert into restaurant_payment_settings (restaurant_id, upi_id, upi_payee_name) values (current_restaurant_id(), 'shop@ybl', 'Cafe A')$q$);
select t.raises('...but not a malformed one',
  $q$update restaurant_payment_settings set upi_id = 'not a upi id'$q$, 'check');
select t.works('the owner can read the reports', $q$select * from report_data(current_date - 1, current_date)$q$);
select t.raises('reports are limited to 92 days',
  $q$select * from report_data(current_date - 200, current_date)$q$, '92');
reset role;

-- ---- what the guest sees of payment settings ----
set role anon;
select t.eq('guests are told the UPI id they must pay (and only that)',
  (select payment_options('cafe-a')::jsonb ->> 'upi_id'), 'shop@ybl');
reset role;

-- ---- paying ----
set role anon;
select t.raises('a guest cannot claim a payment method that does not exist',
  format($q$select claim_payment(%L, 'bitcoin')$q$, :'session_a'), 'bad payment method');
select t.works('a guest can say they will pay by UPI', format($q$select claim_payment(%L, 'upi')$q$, :'session_a'));
reset role;
select t.eq('...it is only a claim, not a payment',
  (select payment_status || '/' || payment_method from table_sessions where id = :'session_a'), 'claimed/upi');
select t.ok('...and the bill is now requested', (select bill_requested from table_sessions where id = :'session_a'));
set role anon;
select t.eq('a guest cannot mark a bill as paid directly',
  t.rows_changed($q$update table_sessions set payment_status = 'paid'$q$), 0::bigint);
reset role;

select t.as_user(:'staff_a');
set role authenticated;
select t.eq('staff can confirm the payment',
  t.rows_changed(format($q$update table_sessions set payment_status = 'paid', payment_method = 'upi' where id = %L$q$, :'session_a')), 1::bigint);
reset role;
select t.ok('...and the time of payment is stamped automatically',
  (select paid_at is not null from table_sessions where id = :'session_a'));
set role anon;
select t.works('a late claim on a paid bill does nothing', format($q$select claim_payment(%L, 'cash')$q$, :'session_a'));
reset role;
select t.eq('...the bill stays paid', (select payment_status from table_sessions where id = :'session_a'), 'paid');

select t.as_user(:'owner_b');
set role authenticated;
select t.eq('another café cannot touch this café''s bill',
  t.rows_changed(format($q$update table_sessions set payment_status = 'unpaid' where id = %L$q$, :'session_a')), 0::bigint);
reset role;

-- ---- the billing switch ----
update restaurant_billing set status = 'suspended' where restaurant_id = t.restaurant_id('cafe-a');
select t.as_user(:'staff_a');
set role authenticated;
select t.ok('a suspended café''s staff are locked out of everything', current_restaurant_id() is null);
select t.eq('...they see no orders', (select count(*) from orders), 0::bigint);
select t.eq('...and are told why', (select my_billing_status()), 'suspended');
reset role;
set role anon;
select t.ok('guests are told the café is closed', not restaurant_is_open('cafe-a'));
select t.raises('guests cannot order from a suspended café',
  format('select * from t.place(%L, %L, 1, %L, 1)', 'cafe-a', :'a1', :'tea_a'), 'taking orders');
select t.ok('other cafés are unaffected', restaurant_is_open('cafe-b'));
reset role;
update restaurant_billing set status = 'active';
set role anon;
select t.works('ordering works again once it is switched back',
  format('select * from t.place(%L, %L, 1, %L, 1)', 'cafe-a', :'a1', :'tea_a'));
reset role;

-- ---- the cleanup tool ----
select t.as_user(:'owner_a');
set role authenticated;
select t.raises('an owner cannot run the cleanup tool',
  $q$select reset_test_data('cafe-a', now())$q$, 'permission denied');
reset role;
set role service_role;
select t.ok('the cleanup tool only looks by default',
  (select reset_test_data('cafe-a', now())->>'mode') like 'DRY RUN%');
select t.ok('...a wrong phrase is still only a look',
  (select reset_test_data('cafe-a', now(), 'wrong')->>'mode') like 'DRY RUN%');
reset role;
select t.ok('...so nothing was deleted', (select count(*) from orders where restaurant_id = t.restaurant_id('cafe-a')) >= 1);
set role service_role;
select t.ok('with the exact phrase it deletes the test orders',
  (select reset_test_data('cafe-a', now(), 'RESET cafe-a')->>'mode') not like 'DRY RUN%');
reset role;
select t.eq('...only in that café', (select count(*) from orders where restaurant_id = t.restaurant_id('cafe-a')), 0::bigint);
select t.ok('...the other café keeps its orders', (select count(*) from orders where restaurant_id = t.restaurant_id('cafe-b')) = 1);
select t.ok('...and the menu and tables survive',
  (select count(*) from menu_items where restaurant_id = t.restaurant_id('cafe-a')) = 1
  and (select count(*) from restaurant_tables where restaurant_id = t.restaurant_id('cafe-a')) = 10);