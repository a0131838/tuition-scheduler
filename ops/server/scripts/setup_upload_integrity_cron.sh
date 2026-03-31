#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/apps/tuition-scheduler}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/tuition-scheduler_upload_integrity.log}"
CRON_TZ_VALUE="${CRON_TZ_VALUE:-Asia/Singapore}"
CRON_EXPR="${CRON_EXPR:-0 8 * * *}"
ENV_FILE="${ENV_FILE:-$APP_DIR/ops/server/.deploy.env}"
RUN_CMD="${RUN_CMD:-/bin/bash $APP_DIR/ops/server/scripts/run_upload_integrity_with_alert.sh $ENV_FILE}"

mkdir -p "$LOG_DIR"

ENTRY="$CRON_EXPR $RUN_CMD >> $LOG_FILE 2>&1"
MARKER="audit:upload-integrity"

{
  crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v "^CRON_TZ=$CRON_TZ_VALUE$" || true
  echo "CRON_TZ=$CRON_TZ_VALUE"
  echo "$ENTRY # $MARKER"
} | awk '!seen[$0]++' | crontab -

echo "Upload integrity cron installed:"
echo "CRON_TZ=$CRON_TZ_VALUE"
echo "$ENTRY"
