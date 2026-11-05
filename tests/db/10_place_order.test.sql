-- The one public way in: guests order without logging in. It must refuse abuse
-- and never let one customer lock out the others.

select t.reset();
select t.make_cafe('wc', 'owner@example.com') as owner \gset
select t.make_item('wc', 'Tea', 100) as tea \gset
select t.table_id('wc', 'Table 1') as t1, t.table_id('wc', 'Table 2') as t2, t.table_id('wc', 'Table 3') as t3, t.table_id('wc', 'Table 4') as t4, t.table_id('wc', 'Table 5') as t5, t.table_id('wc', 'Table 6') as t6, t.table_id('wc', 'Table 7') as t7, t.table_id('wc', 'Table 8') as t8, t.table_id('wc', 'Table 9') as t9, t.table_id('wc', 'Table 10') as t10, t.table_id('wc', 'Table 11') as t11, t.table_id('wc', 'Table 12') as t12 \gset

set role anon;

-- normal use
select t.ok('a normal order works and returns a number and a code',
  (select count(*) from t.place('wc', :'t1', 2, :'tea', 2)) = 1);

-- limits on one order
select t.raises('31 items in one order is refused',
  format('select * from t.place(%L, %L, 2, %L, 31)', 'wc', :'t2', :'tea'), 'Too many items');
select t.ok('30 items is fine',
  (select count(*) from t.place('wc', :'t2', 2, :'tea', 30)) = 1);
select t.raises('21 guests at one table is refused',
  format('select * from t.place(%L, %L, 21, %L, 1)', 'wc', :'t3', :'tea'), 'Too many guests');
select t.ok('20 guests is fine',
  (select count(*) from t.place('wc', :'t3', 20, :'tea', 1)) = 1);
select t.raises('a 201-character note is refused',
  format('select * from t.place(%L, %L, 1, %L, 1, repeat(%L, 201))', 'wc', :'t4', :'tea', 'x'), 'too long');
select t.ok('a 200-character note is fine',
  (select count(*) from t.place('wc', :'t4', 1, :'tea', 1, repeat('x', 200))) = 1);
select t.raises('an empty order is refused',
  format('select * from public.place_order(%L, %L, 1, %L::jsonb)', 'wc', :'t5', '[]'), 'at least one item');
select t.raises('an order that is not a list is refused',
  format('select * from public.place_order(%L, %L, 1, %L::jsonb)', 'wc', :'t5', '{"a":1}'), 'at least one item');
select t.raises('a menu item that does not exist is refused',
  format('select * from public.place_order(%L, %L, 1, %L::jsonb)', 'wc', :'t5',
    '[{"menu_item_id":"00000000-0000-0000-0000-000000000000","quantity":1}]'), 'not available');
select t.raises('an unknown table is refused',
  format('select * from t.place(%L, %L, 1, %L, 1)', 'wc', '00000000-0000-0000-0000-000000000000', :'tea'), 'Unknown table');
select t.raises('an unknown café is refused',
  format('select * from t.place(%L, %L, 1, %L, 1)', 'nope', :'t5', :'tea'), 'Unknown restaurant');

-- rate limits: one table cannot use up everyone's allowance
select t.ok('a table can place 5 orders in a minute',
  (select count(*) from (select t.place('wc', :'t6', 1, :'tea', 1) from generate_series(1, 5)) s) = 5);
select t.raises('the 6th order from the same table is refused',
  format('select * from t.place(%L, %L, 1, %L, 1)', 'wc', :'t6', :'tea'), 'Too many orders from this table');
select t.ok('other tables still work meanwhile',
  (select count(*) from t.place('wc', :'t7', 1, :'tea', 1)) = 1);

reset role;

-- order numbers
select t.ok('every order got a number from today, with none repeated',
  (select count(*) = count(distinct order_number) and bool_and(business_day is not null) from orders));
select t.eq('numbers start at 001', (select min(order_number) from orders), '001');
select t.raises('the database itself refuses a repeated number (safety net behind the counter)',
  $q$insert into orders (restaurant_id, table_id, session_id, business_day, order_number, validation_code, subtotal, tax, total)
     select restaurant_id, table_id, session_id, business_day, order_number, '0', 0, 0, 0
     from orders where business_day is not null limit 1$q$, 'duplicate key');

-- the café-wide backstop
insert into orders (restaurant_id, table_id, session_id, order_number, validation_code, subtotal, tax, total)
select o.restaurant_id, o.table_id, o.session_id, 'x' || g, '0', 0, 0, 0
from (select * from orders limit 1) o, generate_series(1, 120) g;
set role anon;
select t.raises('120 orders in a minute across the café stops a 121st',
  format('select * from t.place(%L, %L, 1, %L, 1)', 'wc', :'t8', :'tea'), 'Too many orders right now');
reset role;
delete from orders where order_number like 'x%';

-- a new business day starts again at 001
update orders set business_day = business_day - 1;
update order_counters set business_day = business_day - 1;
set role anon;
select t.eq('the next day starts again at 001',
  (select order_number from t.place('wc', :'t9', 1, :'tea', 1)), '001');

-- guests cannot touch the machinery
select t.raises('guests cannot read the order counters', 'select * from order_counters', 'permission denied');
select t.raises('guests cannot call the numbering function directly',
  format('select * from next_order_number(%L)', t.restaurant_id('wc')), 'permission denied');
select t.eq('guests cannot read orders directly', (select count(*) from orders), 0::bigint);
select t.raises('guests cannot write orders directly',
  format('insert into orders (restaurant_id, table_id, order_number, validation_code) values (%L, %L, %L, %L)',
    t.restaurant_id('wc'), :'t1', 'hack', '0000'), 'row-level security');

-- staff taking an order at the table use the same numbering
reset role;
select t.as_user(:'owner');
set role authenticated;
select t.ok('staff can take an order for a table',
  (select count(*) from public.staff_place_order(t.table_id('wc', 'Table 10'), 2,
     (select jsonb_agg(jsonb_build_object('menu_item_id', :'tea'::text, 'quantity', 1)) from generate_series(1, 2)))) = 1);
select t.raises('staff orders over 50 lines are refused',
  format('select * from public.staff_place_order(%L, 2, (select jsonb_agg(jsonb_build_object(%L, %L, %L, 1)) from generate_series(1, 51)))',
    t.table_id('wc', 'Table 10'), 'menu_item_id', :'tea', 'quantity'), '.');
reset role;
select t.eq('the staff order carries on the same day sequence as the guest order',
  (select array_agg(order_number order by order_number) from orders
    where business_day = (select max(business_day) from orders)),
  array['001', '002']);
select t.ok('no number is ever repeated within a café and day',
  (select count(*) = count(distinct (restaurant_id, business_day, order_number)) from orders where business_day is not null));