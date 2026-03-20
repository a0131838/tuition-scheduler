#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ "$(id -un)" == "root" ]]; then
  echo "Run as deploy user, not root."
  exit 1
fi

mkdir -p "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
# Servers sometimes end up with CRLF/local edits. Reset to the remote branch to keep deploys repeatable.
git reset --hard "origin/$BRANCH"
git pull origin "$BRANCH"

# Remove stale untracked files/dirs from prior manual syncs or emergency patches.
# Keep runtime env and uploaded files.
if [[ "${CLEAN_UNTRACKED:-true}" == "true" ]]; then
  git clean -fd \
    -e .env \
    -e .env.bak* \
    -e ops/server/.deploy.env \
    -e ops/server/.deploy.env.bak* \
    -e public/uploads
fi

cat > .env <<EOF
NODE_ENV=production
NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
DATABASE_URL=$DATABASE_URL
DIRECT_DATABASE_URL=$DIRECT_DATABASE_URL
MANAGER_EMAILS=$MANAGER_EMAILS
OWNER_MANAGER_EMAIL=$OWNER_MANAGER_EMAIL
CRON_SECRET=$CRON_SECRET
SHARED_DOC_STORAGE_DRIVER=${SHARED_DOC_STORAGE_DRIVER:-s3}
SHARED_DOC_S3_BUCKET=${SHARED_DOC_S3_BUCKET:-}
SHARED_DOC_S3_REGION=${SHARED_DOC_S3_REGION:-ap-hongkong}
SHARED_DOC_S3_ENDPOINT=${SHARED_DOC_S3_ENDPOINT:-}
SHARED_DOC_S3_FORCE_PATH_STYLE=${SHARED_DOC_S3_FORCE_PATH_STYLE:-false}
SHARED_DOC_S3_ACCESS_KEY_ID=${SHARED_DOC_S3_ACCESS_KEY_ID:-}
SHARED_DOC_S3_SECRET_ACCESS_KEY=${SHARED_DOC_S3_SECRET_ACCESS_KEY:-}
EOF

npm ci
npx prisma generate
npx prisma migrate deploy
if [[ "${RUN_SEED:-false}" == "true" ]]; then
  npx prisma db seed
fi
npm run build

pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$APP_NAME" -- start -- -p "$APP_PORT"
pm2 save

echo "Deploy done: $APP_NAME on port $APP_PORT"
