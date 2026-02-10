#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
SCRIPT_PATH="${SCRIPT_PATH:-$PWD/ops/server/scripts/monitor_http.sh}"
CRON_EXPR="${CRON_EXPR:-*/5 * * * *}"

# If ENV_FILE exists, load APP_NAME for log file naming.
APP_NAME="tuition-scheduler"
if [[ -r "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
elif [[ -f "$ENV_FILE" ]]; then
  echo "WARN: env file exists but is not readable: $ENV_FILE (using default APP_NAME=$APP_NAME)" >&2
fi

LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_FILE:-$LOG_DIR/${APP_NAME}_monitor.log}"
ENTRY="$CRON_EXPR /bin/bash $SCRIPT_PATH $ENV_FILE >> $LOG_FILE 2>&1"

( crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" || true; echo "$ENTRY" ) | crontab -

echo "Monitor cron installed:"
echo "$ENTRY"
