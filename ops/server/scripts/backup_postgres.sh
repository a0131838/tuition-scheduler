#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/$APP_NAME}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F_%H%M%S)"
OUT="$BACKUP_DIR/${APP_NAME}_${STAMP}.dump"

URL_FOR_DUMP="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

# If you're backing up Neon Postgres (often v17+), you may need a matching/newer pg_dump.
# You can override by setting PG_DUMP_BIN (e.g. /usr/lib/postgresql/17/bin/pg_dump).
PG_DUMP_BIN="${PG_DUMP_BIN:-}"
if [[ -z "$PG_DUMP_BIN" && -x /usr/lib/postgresql/17/bin/pg_dump ]]; then
  PG_DUMP_BIN="/usr/lib/postgresql/17/bin/pg_dump"
fi
if [[ -z "$PG_DUMP_BIN" ]]; then
  PG_DUMP_BIN="pg_dump"
fi

# libpq tools (pg_dump/psql) don't understand Prisma's `?schema=...` param.
URL_FOR_DUMP_CLEAN="$(URL="$URL_FOR_DUMP" python3 - <<'PY'
import os, urllib.parse
u=os.environ["URL"]
p=urllib.parse.urlsplit(u)
q=urllib.parse.parse_qsl(p.query, keep_blank_values=True)
q=[(k,v) for (k,v) in q if k.lower() != "schema"]
print(urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,urllib.parse.urlencode(q),p.fragment)))
PY
)"

"$PG_DUMP_BIN" "$URL_FOR_DUMP_CLEAN" -Fc --no-owner --no-privileges -f "$OUT"
if [[ ! -s "$OUT" ]]; then
  rm -f "$OUT"
  echo "Backup failed (empty output): $OUT"
  exit 1
fi

# Keep both old and new backup naming patterns to avoid leaving stale files around.
find "$BACKUP_DIR" -type f -name "${APP_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name "${APP_NAME}_*.dump" -mtime +"$RETENTION_DAYS" -delete

echo "Backup saved: $OUT"
