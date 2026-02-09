#!/usr/bin/env bash
set -euo pipefail

APP=/home/ubuntu/apps/tuition-scheduler
NEON_FILE=/home/ubuntu/.neon_url

redact_url() {
  python3 - <<'PY'
import os, re
u=os.environ.get("URL","").strip()
u=re.sub(r'(postgres(?:ql)?://[^:/?#\\s]+:)[^@/?#\\s]+', r'\\1***', u)
print(u)
PY
}

echo "== Env Files =="
cd "$APP"
for f in .env .env.production ops/server/.deploy.env; do
  if [ -f "$f" ]; then
    echo "-- $f"
    if grep -q '^DATABASE_URL=' "$f"; then
      u="$(grep -m1 '^DATABASE_URL=' "$f" | sed 's/^DATABASE_URL=//')"
      echo -n "DATABASE_URL="
      URL="$u" redact_url
    fi
    if grep -q '^DIRECT_DATABASE_URL=' "$f"; then
      u="$(grep -m1 '^DIRECT_DATABASE_URL=' "$f" | sed 's/^DIRECT_DATABASE_URL=//')"
      echo -n "DIRECT_DATABASE_URL="
      URL="$u" redact_url
    fi
  fi
done

echo
echo "== DB Checks =="

# Avoid committing credentials. If you want to check a local DB, set:
#   LOCAL_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DB"
LOCAL_URL="${LOCAL_DATABASE_URL:-postgresql://localhost:5432/tuition_db}"
if [ -f "$NEON_FILE" ]; then
  NEON_URL="$(cat "$NEON_FILE")"
else
  NEON_URL=""
fi

check_db() {
  local name="$1"
  local url="$2"
  if [ -z "$url" ]; then
    echo "-- $name: (missing url)"
    return 0
  fi
  echo "-- $name"
  echo -n "url="
  URL="$url" redact_url

  psql "$url" -v ON_ERROR_STOP=1 -Atc "select current_database()||':'||current_schema();" | sed 's/^/db=/' || true
  psql "$url" -v ON_ERROR_STOP=1 -Atc "select to_regclass('public._prisma_migrations');" | sed 's/^/_prisma_migrations=/' || true
  psql "$url" -v ON_ERROR_STOP=1 -Atc "select count(*) from information_schema.columns where table_schema='public' and table_name='Class' and column_name in ('oneOnOneGroupId','oneOnOneStudentId');" | sed 's/^/class_one_on_one_columns=/' || true
  # If migrations table exists, show last applied migration id (if any).
  psql "$url" -v ON_ERROR_STOP=1 -Atc "select name from public._prisma_migrations order by finished_at desc nulls last limit 1;" 2>/dev/null | sed 's/^/last_migration=/' || true
}

check_db "LOCAL" "$LOCAL_URL"
echo
check_db "NEON" "$NEON_URL"
