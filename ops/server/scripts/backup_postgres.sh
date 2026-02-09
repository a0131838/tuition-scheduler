#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/$APP_NAME}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F_%H%M%S)"
OUT="$BACKUP_DIR/${APP_NAME}_${STAMP}.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$OUT"
find "$BACKUP_DIR" -type f -name "${APP_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup saved: $OUT"
