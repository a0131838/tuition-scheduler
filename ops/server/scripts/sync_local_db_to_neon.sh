#!/usr/bin/env bash
set -euo pipefail

# Sync local Postgres data to Neon (overwrite Neon), then switch server env to Neon and deploy.
# Neon URL is read from /home/ubuntu/.neon_url to avoid hardcoding secrets in scripts/commands.

APP=/home/ubuntu/apps/tuition-scheduler
ENV_FILE="$APP/ops/server/.deploy.env"
NEON_FILE="/home/ubuntu/.neon_url"

if [ ! -f "$NEON_FILE" ]; then
  echo "Missing $NEON_FILE"
  echo "Create it on the server:"
  echo "  printf '%s' 'YOUR_NEON_DATABASE_URL' > $NEON_FILE"
  echo "  chmod 600 $NEON_FILE"
  exit 2
fi

NEON_URL="$(cat "$NEON_FILE")"
if [ -z "$NEON_URL" ]; then
  echo "$NEON_FILE is empty"
  exit 2
fi

# Use Neon pooler for runtime `DATABASE_URL`, but prefer direct (non-pooler) host for migrations `DIRECT_DATABASE_URL`.
NEON_URL_DIRECT="$(URL="$NEON_URL" python3 - <<'PY'
import os, urllib.parse
u=os.environ["URL"].strip()
p=urllib.parse.urlsplit(u)
host = p.hostname or ""
if host and "-pooler" in host:
    host = host.replace("-pooler", "")
netloc = p.netloc
if p.hostname:
    # Rebuild netloc to preserve user/pass/port
    userinfo = ""
    if p.username:
        userinfo += urllib.parse.quote(p.username, safe="")
    if p.password is not None:
        userinfo += ":" + urllib.parse.quote(p.password, safe="")
    if userinfo:
        userinfo += "@"
    port = f":{p.port}" if p.port else ""
    netloc = f"{userinfo}{host}{port}"
print(urllib.parse.urlunsplit((p.scheme, netloc, p.path, p.query, p.fragment)))
PY
)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# Load current DB url (assumed local postgres right now).
set -a
. "$ENV_FILE"
set +a

LOCAL_URL="${DATABASE_URL:-}"
if [ -z "$LOCAL_URL" ]; then
  echo "DATABASE_URL is empty in $ENV_FILE"
  exit 1
fi

# libpq tools (pg_dump/psql) don't understand Prisma's `?schema=...` param.
LOCAL_URL_DUMP="$(URL="$LOCAL_URL" python3 - <<'PY'
import os, urllib.parse
u=os.environ["URL"]
p=urllib.parse.urlsplit(u)
q=urllib.parse.parse_qsl(p.query, keep_blank_values=True)
q=[(k,v) for (k,v) in q if k.lower() != "schema"]
print(urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,urllib.parse.urlencode(q),p.fragment)))
PY
)"

mkdir -p /home/ubuntu/backups
TS="$(date +%Y%m%d_%H%M%S)"
DUMP="/home/ubuntu/backups/tuition_db_${TS}.dump"
ENV_BAK="/home/ubuntu/backups/deploy.env_${TS}.bak"
cp -a "$ENV_FILE" "$ENV_BAK"

echo "Dumping local -> $DUMP"
pg_dump "$LOCAL_URL_DUMP" -Fc --no-owner --no-privileges -f "$DUMP"
test -s "$DUMP"

echo "Testing Neon connection"
psql "$NEON_URL" -c "select 1" >/dev/null

echo "Restoring dump -> Neon (overwrite)"
pg_restore --no-owner --no-privileges --clean --if-exists --single-transaction -d "$NEON_URL" "$DUMP"

echo "Updating server env to Neon (backup: $ENV_BAK)"
ENV_PATH="$ENV_FILE" NEON_URL="$NEON_URL" NEON_URL_DIRECT="$NEON_URL_DIRECT" python3 - <<'PY'
from pathlib import Path
import os

env_path = Path(os.environ["ENV_PATH"])
neon = os.environ["NEON_URL"]
neon_direct = os.environ["NEON_URL_DIRECT"]

lines = env_path.read_text(encoding="utf-8").splitlines(True)
out = []
for line in lines:
    if line.startswith("DATABASE_URL="):
        out.append(f'DATABASE_URL="{neon}"\n')
    elif line.startswith("DIRECT_DATABASE_URL="):
        out.append(f'DIRECT_DATABASE_URL="{neon_direct}"\n')
    else:
        out.append(line)
env_path.write_text("".join(out), encoding="utf-8")
PY

echo "Deploying"
/usr/local/bin/tuition-deploy

echo "Health check"
/usr/local/bin/tuition-check

echo "Done"
