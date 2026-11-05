# Testing

Two kinds of tests. Run both before you deploy.

```bash
npm test          # logic tests, about 5 seconds, needs nothing else
npm run test:db   # database tests, needs PostgreSQL installed locally
npm run test:all  # both
```

Then `npx next build`, then deploy.

## Logic tests (`tests/lib`)

Plain functions in `lib/`: the bill and guest split, the cart, CSV export,
the menu importer, photo matching, UPI links and ID checks, the floor layout,
reservations and booking windows, business-day helpers, QR addresses, and which
drawing and tone a menu category gets. They use Vitest and need no browser,
no Supabase and no network.

A test that has never failed proves little, so when you add one, break the
code on purpose once and check the test notices.

## Database tests (`tests/db`)

`scripts/test-db.sh` creates a throwaway database, loads every migration in
order (the baseline, then 010 and up), and runs each `tests/db/*.test.sql`.
It never touches your real Supabase project. It checks that:

- guests can't exceed order limits, and one table can't lock out the others
- order numbers never repeat, even with 20 guests ordering at the same moment
- cafés can't see each other's data, and guests can't see private tables
- only the owner can change tax, payment settings and reports
- a suspended café is locked out and refuses orders
- `create_restaurant` and `reset_test_data` are safe by default and not callable by owners

You need PostgreSQL and a user allowed to create databases. On Debian or
Ubuntu, if you only have the `postgres` system user:

```bash
sudo apt install postgresql
sudo -u postgres env PATH="$PATH" bash scripts/test-db.sh
```

The script also creates three Postgres roles called `anon`, `authenticated`
and `service_role` the first time (they are shared by the whole server and
only imitate what Supabase gives you).

## Adding a migration

When you add migration `020` and up, nothing else is needed: the runner loads
it automatically. Add a `tests/db/NN_name.test.sql` for any new rule. The
helpers are in `tests/db/01_helpers.sql`: `t.ok`, `t.eq`, `t.raises`,
`t.works`, `t.rows_changed`, and the fixtures `t.make_cafe`, `t.add_staff`,
`t.make_item`, `t.place`.

## What these tests do not cover

Real phones and other browsers, your live Supabase and Cloudflare, the
look of the screens, and the screens' behavior. Check those by hand after
each deploy.
