#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/apps/tuition-scheduler}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/tuition-scheduler_uploads_backup.log}"
CRON_TZ_VALUE="${CRON_TZ_VALUE:-Asia/Singapore}"
CRON_EXPR="${CRON_EXPR:-30 2 * * *}"
ENV_FILE="${ENV_FILE:-$APP_DIR/ops/server/.deploy.env}"
RUN_CMD="${RUN_CMD:-/bin/bash $APP_DIR/ops/server/scripts/backup_uploads_to_object_storage.sh $ENV_FILE}"

mkdir -p "$LOG_DIR"

ENTRY="$CRON_EXPR $RUN_CMD >> $LOG_FILE 2>&1"
MARKER="backup:uploads-object-storage"

{
  crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v "^CRON_TZ=$CRON_TZ_VALUE$" || true
  echo "CRON_TZ=$CRON_TZ_VALUE"
  echo "$ENTRY # $MARKER"
} | awk '!seen[$0]++' | crontab -

echo "Uploads backup cron installed:"
echo "CRON_TZ=$CRON_TZ_VALUE"
echo "$ENTRY"
