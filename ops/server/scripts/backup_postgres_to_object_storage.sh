#!/usr/bin/env bash
set -euo pipefail

# Backup Postgres to a local dump file, then optionally upload to object storage (S3-compatible).
#
# Secrets are read from /etc/tuition-scheduler/backup.env (not from ops/server/.deploy.env)
# so they won't be written into the app runtime .env.

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -r "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

OPS_ENV="/etc/tuition-scheduler/backup.env"
if [[ -r "$OPS_ENV" ]]; then
  # shellcheck disable=SC1090
  # Export vars so the upload script (new process) can read them.
  set -a
  source "$OPS_ENV"
  set +a
elif [[ -f "$OPS_ENV" ]]; then
  echo "WARN: backup env exists but is not readable: $OPS_ENV (upload will be skipped)" >&2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
trap 'bash "$SCRIPT_DIR/check-disk-usage.sh" "$ENV_FILE" --backup-failed database || true' ERR

# Serialize creation/rotation so concurrent runs cannot replace verification state.
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/${APP_NAME:-tuition-scheduler}}"
mkdir -p "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/.backup.lock"
flock -w 300 9

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
  false # ERR trap sends a failure alert; no local rotation occurs.
fi

bash "$SCRIPT_DIR/upload_object_storage_s3.sh" "$LATEST"

# Preserve ALL cloud history; only prune checksum-verified local duplicates.
python3 "$SCRIPT_DIR/verified_backup_retention.py" --apply
