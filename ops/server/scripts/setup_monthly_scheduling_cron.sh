#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-${APP_DIR:-/home/ubuntu/apps/tuition-scheduler}}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/tuition-scheduler_monthly_scheduling.log}"
CRON_TZ_VALUE="${CRON_TZ_VALUE:-Asia/Singapore}"
CRON_EXPR="${CRON_EXPR:-15 8 * * *}"
MARKER="# tuition-scheduler-monthly-scheduling"

mkdir -p "$LOG_DIR"

ENTRY="$CRON_EXPR mkdir -p '$LOG_DIR' && cd '$APP_DIR' && /usr/bin/npm run scheduling:monthly-sync >> '$LOG_FILE' 2>&1 $MARKER"

{
  crontab -l 2>/dev/null | grep -vF "$MARKER" | grep -v "^CRON_TZ=$CRON_TZ_VALUE$" || true
  echo "CRON_TZ=$CRON_TZ_VALUE"
  echo "$ENTRY"
} | awk '!seen[$0]++' | crontab -

echo "Monthly scheduling cron installed:"
echo "CRON_TZ=$CRON_TZ_VALUE"
echo "$ENTRY"
