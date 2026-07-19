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

if [[ -z "${DATABASE_URL:-}" || -z "${DIRECT_DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL or DIRECT_DATABASE_URL in $ENV_FILE"
  exit 1
fi

# Safety fuse: block accidental deploy to local/empty database in production.
if [[ "${ALLOW_LOCAL_DB_IN_PROD:-false}" != "true" ]]; then
  if [[ "$DATABASE_URL" == *"localhost"* || "$DATABASE_URL" == *"127.0.0.1"* || "$DATABASE_URL" == *"@tuition_db"* || "$DATABASE_URL" == *"tuition:tuition@"* ]]; then
    echo "Refusing deploy: DATABASE_URL looks like local/dev database."
    exit 1
  fi
  if [[ "$DIRECT_DATABASE_URL" == *"localhost"* || "$DIRECT_DATABASE_URL" == *"127.0.0.1"* || "$DIRECT_DATABASE_URL" == *"@tuition_db"* || "$DIRECT_DATABASE_URL" == *"tuition:tuition@"* ]]; then
    echo "Refusing deploy: DIRECT_DATABASE_URL looks like local/dev database."
    exit 1
  fi
fi

mkdir -p "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH:refs/remotes/origin/$BRANCH"
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

# Release process gate: require changelog/task/release-board updates in the deploy commit.
# Emergency bypass: set SKIP_RELEASE_DOC_CHECK=true in deploy env.
if [[ "${SKIP_RELEASE_DOC_CHECK:-false}" != "true" ]]; then
  bash ops/server/scripts/verify_release_docs.sh HEAD
else
  echo "WARNING: SKIP_RELEASE_DOC_CHECK=true (release doc gate bypassed)"
fi

# Share images are rendered server-side through librsvg/fontconfig. Keep a real
# Simplified Chinese font available so Chinese reminder copy never becomes tofu boxes.
if ! fc-list :lang=zh 2>/dev/null | grep -q .; then
  echo "Installing production CJK font support..."
  sudo -n apt-get update -qq
  sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fontconfig fonts-noto-cjk
  fc-cache -f
fi
if ! fc-match "Noto Sans CJK SC" 2>/dev/null | grep -qi "NotoSansCJK"; then
  echo "Production CJK font verification failed."
  exit 1
fi

cat > .env <<EOF
NODE_ENV=production
NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
DATABASE_URL=$DATABASE_URL
DIRECT_DATABASE_URL=$DIRECT_DATABASE_URL
MANAGER_EMAILS=$MANAGER_EMAILS
OWNER_MANAGER_EMAIL=$OWNER_MANAGER_EMAIL
CRON_SECRET=$CRON_SECRET
WECHAT_MINIAPP_APPID=${WECHAT_MINIAPP_APPID:-}
WECHAT_MINIAPP_SECRET=${WECHAT_MINIAPP_SECRET:-}
WECHAT_TEMPLATE_COURSE_REMINDER=${WECHAT_TEMPLATE_COURSE_REMINDER:-}
WECHAT_TEMPLATE_CLASS_REMINDER=${WECHAT_TEMPLATE_CLASS_REMINDER:-}
WECHAT_TEMPLATE_COURSE_START=${WECHAT_TEMPLATE_COURSE_START:-}
WECHAT_TEMPLATE_REQUEST_STATUS=${WECHAT_TEMPLATE_REQUEST_STATUS:-}
WECHAT_TEMPLATE_FINANCE_UNPAID=${WECHAT_TEMPLATE_FINANCE_UNPAID:-}
WECHAT_TEMPLATE_INVOICE_ISSUED=${WECHAT_TEMPLATE_INVOICE_ISSUED:-}
WECHAT_TEMPLATE_RECEIPT_ISSUED=${WECHAT_TEMPLATE_RECEIPT_ISSUED:-}
WECHAT_TEMPLATE_FEEDBACK_PUBLISHED=${WECHAT_TEMPLATE_FEEDBACK_PUBLISHED:-}
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

if [[ -x ops/server/scripts/setup_miniapp_course_reminder_cron.sh ]]; then
  bash ops/server/scripts/setup_miniapp_course_reminder_cron.sh "$APP_DIR"
fi

echo "Deploy done: $APP_NAME on port $APP_PORT"
