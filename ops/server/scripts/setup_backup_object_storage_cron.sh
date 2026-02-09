#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

SCRIPT_PATH="${SCRIPT_PATH:-$PWD/ops/server/scripts/backup_postgres_to_object_storage.sh}"
CRON_TIME="${CRON_TIME:-0 3 * * *}"

LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_FILE:-$LOG_DIR/${APP_NAME}_backup_object_storage.log}"
ENTRY="$CRON_TIME /bin/bash $SCRIPT_PATH $ENV_FILE >> $LOG_FILE 2>&1"

( crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" || true; echo "$ENTRY" ) | crontab -

echo "Backup-to-object-storage cron installed:"
echo "$ENTRY"
