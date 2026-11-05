-- Only the owner changes café settings, and only what the Settings page offers.

select t.reset();
select t.make_cafe('one', 'o1@example.com') as owner1 \gset
select t.add_staff('one', 'm1@example.com', 'manager') as manager1 \gset
select t.add_staff('one', 'w1@example.com', 'staff') as staff1 \gset
select t.make_cafe('two', 'o2@example.com') as owner2 \gset

-- staff and managers can read the café but not change it
select t.as_user(:'staff1');
set role authenticated;
select t.eq('staff can read their café', (select count(*) from restaurants), 1::bigint);
select t.eq('staff cannot change the tax rate (no row is touched)',
  t.rows_changed($q$update restaurants set tax_rate = 0.99$q$), 0::bigint);
select t.raises('staff cannot rename the café', $q$update restaurants set name = 'hack'$q$, 'permission denied');
select t.raises('staff cannot change the day start', $q$select set_day_start('04:00')$q$, 'Only the owner');
select t.raises('staff cannot delete the café', $q$delete from restaurants$q$, 'permission denied');
reset role;

select t.as_user(:'manager1');
set role authenticated;
select t.eq('a manager cannot change the tax rate either',
  t.rows_changed($q$update restaurants set tax_rate = 0.18$q$), 0::bigint);
select t.raises('a manager cannot change the day start', $q$select set_day_start('04:00')$q$, 'Only the owner');
reset role;

-- the owner can change tax, but not name, slug or day start through the table
select t.as_user(:'owner1');
set role authenticated;
select t.eq('the owner can change the tax rate',
  t.rows_changed($q$update restaurants set tax_rate = 0.12$q$), 1::bigint);
select t.eq('...and it is saved', (select tax_rate from restaurants), 0.12::numeric);
select t.raises('the owner cannot rename the café from the browser', $q$update restaurants set name = 'New'$q$, 'permission denied');
select t.raises('...or change the slug (it is printed on QR codes)', $q$update restaurants set slug = 'new'$q$, 'permission denied');
select t.raises('...or write the day start directly', $q$update restaurants set day_start_time = '01:00'$q$, 'permission denied');
select t.raises('a tax rate above 30% is refused', $q$update restaurants set tax_rate = 0.5$q$, 'tax_rate_range');
select t.raises('a negative tax rate is refused', $q$update restaurants set tax_rate = -0.01$q$, 'tax_rate_range');
select t.raises('the owner cannot delete the café', $q$delete from restaurants$q$, 'permission denied');
select t.raises('the owner cannot create cafés from the browser',
  $q$insert into restaurants (slug, name) values ('z', 'z')$q$, 'permission denied');

-- day start has its own safe door
select t.eq('the owner can change the day start', (select set_day_start('04:30')::text), '04:30:00');
select t.eq('...and it is saved', (select day_start_time::text from restaurants), '04:30:00');
select t.raises('a day start after 08:00 is refused', $q$select set_day_start('09:00')$q$, 'between 00:00 and 08:00');
select t.raises('...a late-night start is refused too', $q$select set_day_start('23:00')$q$, 'between 00:00 and 08:00');
reset role;

-- not while a table is open
insert into table_sessions (restaurant_id, table_id, status)
select restaurant_id, id, 'open' from restaurant_tables where name = 'Table 1' and restaurant_id = t.restaurant_id('one');
select t.as_user(:'owner1');
set role authenticated;
select t.raises('the day start cannot change while a table is open', $q$select set_day_start('03:00')$q$, 'Close all open tables');
reset role;
update table_sessions set status = 'closed';
select t.as_user(:'owner1');
set role authenticated;
select t.eq('...but can once every table is closed', (select set_day_start('03:00')::text), '03:00:00');
reset role;

-- another café's owner cannot touch this café
select t.as_user(:'owner2');
set role authenticated;
select t.eq('another café sees only itself', (select count(*) from restaurants), 1::bigint);
select t.eq('...and cannot change the first café',
  t.rows_changed($q$update restaurants set tax_rate = 0.01 where slug = 'one'$q$), 0::bigint);
reset role;
select t.eq('the first café kept its tax rate', (select tax_rate from restaurants where slug = 'one'), 0.12::numeric);

-- guests can still read café names (the public menu needs them) but cannot write
set role anon;
select t.eq('guests can read the café list', (select count(*) from restaurants), 2::bigint);
select t.eq('guests cannot change a café (no row is touched)', t.rows_changed($q$update restaurants set tax_rate = 0$q$), 0::bigint);
select t.raises('guests cannot set a day start', $q$select set_day_start('04:00')$q$, 'permission denied');
reset role;