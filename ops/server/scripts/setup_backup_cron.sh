#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

SCRIPT_PATH="${SCRIPT_PATH:-$PWD/ops/server/scripts/backup_postgres.sh}"
CRON_TIME="${CRON_TIME:-0 3 * * *}"

ENTRY="$CRON_TIME /bin/bash $SCRIPT_PATH $ENV_FILE >> /var/log/${APP_NAME}_backup.log 2>&1"

( crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH"; echo "$ENTRY" ) | crontab -

echo "Backup cron installed: $ENTRY"
