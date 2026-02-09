#!/usr/bin/env bash
set -euo pipefail

# Fix ops/server/.deploy.env DIRECT_DATABASE_URL to use Neon direct (non-pooler) host and correct quoting.
# Then re-run deploy to regenerate .env and run prisma migrate deploy cleanly.

APP=/home/ubuntu/apps/tuition-scheduler
ENV_FILE="$APP/ops/server/.deploy.env"
NEON_FILE=/home/ubuntu/.neon_url

if [ ! -f "$NEON_FILE" ]; then
  echo "Missing $NEON_FILE"
  exit 2
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

NEON_URL="$(cat "$NEON_FILE")"

NEON_URL_DIRECT="$(URL="$NEON_URL" python3 - <<'PY'
import os, urllib.parse
u=os.environ["URL"].strip()
p=urllib.parse.urlsplit(u)
host = (p.hostname or "")
if host and "-pooler" in host:
    host = host.replace("-pooler", "")
netloc = p.netloc
if p.hostname:
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

ENV_FILE="$ENV_FILE" NEON_URL_DIRECT="$NEON_URL_DIRECT" python3 - <<'PY'
from pathlib import Path
import os

env_path = Path(os.environ["ENV_FILE"])
direct = os.environ["NEON_URL_DIRECT"]
lines = env_path.read_text(encoding="utf-8").splitlines(True)
out = []
replaced = False
for line in lines:
    if line.startswith("DIRECT_DATABASE_URL="):
        out.append(f'DIRECT_DATABASE_URL="{direct}"\n')
        replaced = True
    else:
        out.append(line)
if not replaced:
    out.append(f'\nDIRECT_DATABASE_URL="{direct}"\n')
env_path.write_text("".join(out), encoding="utf-8")
print("Updated", str(env_path))
PY

echo "Running deploy"
/usr/local/bin/tuition-deploy
echo "Health check"
/usr/local/bin/tuition-check
