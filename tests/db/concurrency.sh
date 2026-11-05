#!/usr/bin/env bash
# Twenty guests at twenty different tables order in the same instant.
# Every order must succeed and get its own number.
set -euo pipefail
: "${DB:?DB is set by scripts/test-db.sh}"
q() { PGOPTIONS="-c client_min_messages=warning" psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

q -c "select t.reset();" >/dev/null
q -c "select t.make_cafe('rush', 'rush@example.com');" >/dev/null
tea=$(q -c "select t.make_item('rush', 'Tea', 100);")
q -c "insert into restaurant_tables (restaurant_id, name, seats, shape, status, position_x, position_y, position_width, position_height)
      select t.restaurant_id('rush'), 'Extra ' || n, 4, 'square', 'available', 0, 0, 1, 1 from generate_series(1, 20) n;" >/dev/null
mapfile -t tables < <(q -c "select id from restaurant_tables where name like 'Extra %';")

fail_dir=$(mktemp -d)
for id in "${tables[@]}"; do
  (
    q -c "set role anon; select order_number from t.place('rush', '$id', 1, '$tea', 1);" >/dev/null 2>"$fail_dir/$id" || true
  ) &
done
wait

total=$(q -c "select count(*) from orders;")
distinct=$(q -c "select count(distinct order_number) from orders;")
errors=$(cat "$fail_dir"/* | grep -c "ERROR" || true)
rm -rf "$fail_dir"

if [ "$total" = "20" ] && [ "$distinct" = "20" ] && [ "$errors" = "0" ]; then
  echo "   ok: 20 simultaneous orders, 20 different numbers, no errors"
else
  echo "   FAILED: orders=$total distinct_numbers=$distinct errors=$errors" >&2
  exit 1
fi