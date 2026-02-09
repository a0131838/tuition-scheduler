#!/usr/bin/env bash
set -euo pipefail

# Backup Postgres to a local dump file, then optionally upload to object storage (S3-compatible).
#
# Secrets are read from /etc/tuition-scheduler/backup.env (not from ops/server/.deploy.env)
# so they won't be written into the app runtime .env.

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

OPS_ENV="/etc/tuition-scheduler/backup.env"
if [[ -f "$OPS_ENV" ]]; then
  # shellcheck disable=SC1090
  # Export vars so the upload script (new process) can read them.
  set -a
  source "$OPS_ENV"
  set +a
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create local backup.
bash "$SCRIPT_DIR/backup_postgres.sh" "$ENV_FILE"

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/$APP_NAME}"
LATEST="$(ls -1t "$BACKUP_DIR/${APP_NAME}_"*.dump 2>/dev/null | head -n 1 || true)"
if [[ -z "$LATEST" ]]; then
  echo "No dump file found in $BACKUP_DIR"
  exit 1
fi

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "S3 not configured (missing S3_BUCKET). Skipping upload."
  echo "Local backup is ready: $LATEST"
  exit 0
fi

bash "$SCRIPT_DIR/upload_object_storage_s3.sh" "$LATEST"
