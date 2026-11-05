-- The tool you use to add a new café: safe by default, refuses mistakes,
-- and only you (not owners, staff or guests) can run it.

select t.reset();
insert into auth.users (email) values ('Owner@Example.com'), ('other@example.com'), ('free@example.com');

-- look first, nothing is created
select t.ok('without the phrase it only looks (dry run)',
  (select create_restaurant('blue-door', 'Blue Door Café', 'owner@example.com')->>'mode') like 'DRY RUN%');
select t.eq('...and nothing was created', (select count(*) from restaurants), 0::bigint);
select t.ok('the wrong phrase is still only a dry run',
  (select create_restaurant('blue-door', 'x', 'owner@example.com', p_confirm => 'CREATE other')->>'mode') like 'DRY RUN%');
select t.eq('...still nothing created', (select count(*) from restaurants), 0::bigint);

-- mistakes are refused with a clear message
select t.raises('a slug with capitals or spaces is refused',
  $q$select create_restaurant('Blue Door', 'x', 'owner@example.com')$q$, 'Slug must be');
select t.raises('an owner email that has no login yet is refused',
  $q$select create_restaurant('blue-door', 'x', 'nobody@example.com')$q$, 'No auth user');
select t.raises('a tax rate of 5 (instead of 0.05) is refused',
  $q$select create_restaurant('blue-door', 'x', 'owner@example.com', 5)$q$, 'Tax rate');
select t.raises('more than 32 starter tables is refused',
  $q$select create_restaurant('blue-door', 'x', 'owner@example.com', 0.05, '05:00', 33)$q$, 'Table count');

-- the real thing
select t.ok('with the phrase it creates the café',
  (select create_restaurant('blue-door', 'Blue Door Café', 'owner@example.com', 0.05, '05:00', 10, 'CREATE blue-door')->>'mode') = 'CREATED');
select t.eq('the café has the given name', (select name from restaurants where slug = 'blue-door'), 'Blue Door Café');
select t.eq('tax is 5%', (select tax_rate from restaurants where slug = 'blue-door'), 0.05::numeric);
select t.eq('the day starts at 05:00', (select day_start_time::text from restaurants), '05:00:00');
select t.eq('the owner is linked (email matching ignores capitals)',
  (select role from staff_profiles), 'owner');
select t.eq('billing starts active', (select status from restaurant_billing), 'active');
select t.eq('10 starter tables were made', (select count(*) from restaurant_tables), 10::bigint);
select t.ok('...named Table 1 to Table 10 and none sit on top of each other',
  (select count(distinct (position_x, position_y)) = 10
     and bool_and(name ~ '^Table ([1-9]|10)$') from restaurant_tables));

-- no double creation
select t.raises('the same slug twice is refused',
  $q$select create_restaurant('blue-door', 'x', 'other@example.com', 0.05, '05:00', 10, 'CREATE blue-door')$q$, 'already exists');
select t.raises('an owner who already has a café is refused',
  $q$select create_restaurant('red-door', 'x', 'owner@example.com', 0.05, '05:00', 10, 'CREATE red-door')$q$, 'already belongs');

select t.ok('a second café with a full 32 tables fits the floor without overlap',
  (select create_restaurant('red-door', 'Red Door', 'other@example.com', 0.12, '04:00', 32, 'CREATE red-door')->>'mode') = 'CREATED');
select t.ok('...32 distinct places',
  (select count(distinct (position_x, position_y)) = 32 from restaurant_tables where restaurant_id = t.restaurant_id('red-door')));
select t.eq('...and its own tax and day start', (select tax_rate::text || ' ' || day_start_time::text from restaurants where slug = 'red-door'), '0.12 04:00:00');

-- who may use it
select id as owner_id from auth.users where email = 'Owner@Example.com' \gset
select t.as_user(:'owner_id');
set role authenticated;
select t.raises('a café owner cannot run it', $q$select create_restaurant('x1', 'x', 'free@example.com')$q$, 'permission denied');
set role anon;
select t.raises('a guest cannot run it', $q$select create_restaurant('x1', 'x', 'free@example.com')$q$, 'permission denied');
set role service_role;
select t.ok('the service role (you, in the SQL editor) can',
  (select create_restaurant('x1', 'x', 'free@example.com')->>'mode') like 'DRY RUN%');
reset role;