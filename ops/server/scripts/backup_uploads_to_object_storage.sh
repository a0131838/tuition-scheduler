#!/usr/bin/env bash
set -euo pipefail

# Create a compressed archive of public/uploads, then upload it to S3-compatible object storage.

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -r "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

OPS_ENV="/etc/tuition-scheduler/backup.env"
if [[ -r "$OPS_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$OPS_ENV"
  set +a
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-/home/ubuntu/apps/tuition-scheduler}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_DIR/public/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/${APP_NAME:-tuition-scheduler}}"

if [[ ! -d "$UPLOADS_DIR" ]]; then
  echo "Uploads directory not found: $UPLOADS_DIR"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
APP_NAME="${APP_NAME:-tuition-scheduler}"
ARCHIVE_PATH="$BACKUP_DIR/${APP_NAME}_uploads_${STAMP}.tar.gz"

tar -C "$APP_DIR/public" -czf "$ARCHIVE_PATH" uploads
echo "Created: $ARCHIVE_PATH"

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "S3 not configured (missing S3_BUCKET). Skipping upload."
  exit 0
fi

bash "$SCRIPT_DIR/upload_object_storage_s3.sh" "$ARCHIVE_PATH"
