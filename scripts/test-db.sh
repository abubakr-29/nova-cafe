#!/usr/bin/env bash
# Database tests: builds a throwaway local Postgres database, loads every
# migration in order, then runs each tests/db/*.test.sql against it.
#
#   npm run test:db
#
# Needs PostgreSQL installed locally and a user that can create databases.
# On Debian/Ubuntu, if you only have the "postgres" system user:
#   sudo -u postgres env PATH="$PATH" bash scripts/test-db.sh
# Nothing here touches your real Supabase project.

set -euo pipefail
cd "$(dirname "$0")/.."

DB="tavro_test_$$"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

cleanup() { dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if ! command -v psql >/dev/null || ! command -v createdb >/dev/null; then
  echo "psql/createdb not found. Install PostgreSQL first (e.g. sudo apt install postgresql)." >&2
  exit 2
fi

createdb "$DB"
echo "== database $DB created"

run() { "${PSQL[@]}" -d "$DB" -f "$1"; }

run tests/db/00_supabase_stubs.sql 2>&1 | grep -v "wal_level\|HINT" || true

migrations=(lib/supabase/migrations/000_baseline_*.sql)
for f in lib/supabase/migrations/[0-9][0-9][0-9]_*.sql; do
  case "$f" in lib/supabase/migrations/000_*) continue ;; esac
  migrations+=("$f")
done

for f in "${migrations[@]}"; do
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null 2>/tmp/tavro_mig_err_$$ || {
    echo "MIGRATION FAILED: $f" >&2; cat /tmp/tavro_mig_err_$$ >&2; exit 1; }
done
echo "== ${#migrations[@]} migrations loaded"

run tests/db/01_helpers.sql

failed=0
for t in tests/db/*.test.sql; do
  echo "== $t"
  out=$(mktemp)
  if "${PSQL[@]}" -d "$DB" -f "$t" >/dev/null 2>"$out"; then status=0; else status=1; fi
  # Show everything except the passing checks and Postgres' cascade chatter.
  sed -E 's/^psql:[^ ]+ NOTICE:  //; /^(psql:[^ ]+ )?NOTICE:  truncate cascades/d; /^truncate cascades/d' "$out" | grep -v "^ok" || true
  echo "   $(grep -c 'NOTICE:  ok' "$out" || true) checks passed"
  rm -f "$out"
  if [ "$status" -ne 0 ]; then failed=1; fi
done

# Many guests ordering at the same moment must still get different numbers.
if [ -f tests/db/concurrency.sh ]; then
  echo "== tests/db/concurrency.sh"
  DB="$DB" bash tests/db/concurrency.sh || failed=1
fi

if [ "$failed" -ne 0 ]; then echo "DATABASE TESTS FAILED" >&2; exit 1; fi
echo "DATABASE TESTS PASSED"