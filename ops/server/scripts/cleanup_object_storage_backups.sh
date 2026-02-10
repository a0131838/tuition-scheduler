#!/usr/bin/env bash
set -euo pipefail

# Delete old backup objects from S3-compatible storage (Tencent COS / AWS S3 / others).
#
# Motivation:
# - COS lifecycle API via AWS CLI may require Content-MD5 and fail in some environments.
# - This script enforces retention by listing objects and deleting those older than N days.
#
# Required env:
# - S3_BUCKET
# - S3_PREFIX (e.g. tuition-scheduler/backups)
# - APP_NAME (used for safe pattern matching)
#
# Optional env:
# - S3_ENDPOINT_URL
# - AWS_DEFAULT_REGION (default ap-hongkong)
# - S3_STORAGE_CLASS (unused here)
# - S3_ADDRESSING_STYLE (virtual|path; default: auto; COS requires virtual)
# - S3_RETENTION_DAYS (default 30)
# - DRY_RUN (true|false; default false)
#
# Usage:
#   bash cleanup_object_storage_backups.sh

AWS_BIN="$(command -v aws 2>/dev/null || true)"
if [[ -z "$AWS_BIN" && -x /snap/bin/aws ]]; then
  AWS_BIN="/snap/bin/aws"
fi
if [[ -z "$AWS_BIN" ]]; then
  echo "Missing aws cli."
  exit 1
fi

S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-}"
APP_NAME="${APP_NAME:-tuition-scheduler}"
if [[ -z "$S3_BUCKET" || -z "$S3_PREFIX" ]]; then
  echo "Missing S3_BUCKET or S3_PREFIX env"
  exit 2
fi

AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-hongkong}"
S3_ENDPOINT_URL="${S3_ENDPOINT_URL:-}"
S3_ADDRESSING_STYLE="${S3_ADDRESSING_STYLE:-}"
S3_RETENTION_DAYS="${S3_RETENTION_DAYS:-30}"
DRY_RUN="${DRY_RUN:-false}"

if ! [[ "$S3_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [[ "$S3_RETENTION_DAYS" -le 0 ]]; then
  echo "Invalid S3_RETENTION_DAYS: $S3_RETENTION_DAYS"
  exit 2
fi

prefix_slash="$S3_PREFIX"
case "$prefix_slash" in
  */) ;;
  *) prefix_slash="$prefix_slash/" ;;
esac

# COS rejects path-style requests; force virtual-hosted-style when using COS endpoints.
if [[ -z "$S3_ADDRESSING_STYLE" && "$S3_ENDPOINT_URL" == *"myqcloud.com"* ]]; then
  S3_ADDRESSING_STYLE="virtual"
fi

AWS_ARGS=(--region "$AWS_DEFAULT_REGION")
if [[ -n "$S3_ENDPOINT_URL" ]]; then
  AWS_ARGS+=(--endpoint-url "$S3_ENDPOINT_URL")
fi

AWS_CONFIG_FILE_TMP=""
cleanup() {
  [[ -n "$AWS_CONFIG_FILE_TMP" ]] && rm -f "$AWS_CONFIG_FILE_TMP" >/dev/null 2>&1 || true
}
trap cleanup EXIT

AWS_ENV=()
if [[ -n "$S3_ADDRESSING_STYLE" ]]; then
  AWS_CONFIG_FILE_TMP="$(mktemp)"
  cat >"$AWS_CONFIG_FILE_TMP" <<EOF
[default]
s3 =
  addressing_style = $S3_ADDRESSING_STYLE
EOF
  AWS_ENV+=(AWS_CONFIG_FILE="$AWS_CONFIG_FILE_TMP")
fi

cutoff="$(date -d \"-$S3_RETENTION_DAYS days\" +%F 2>/dev/null || date -v\"-${S3_RETENTION_DAYS}d\" +%F 2>/dev/null || true)"
if [[ -z "$cutoff" ]]; then
  echo "Cannot compute cutoff date (need GNU date or BSD date)."
  exit 1
fi

echo "Cleanup object storage backups:"
echo "  bucket=$S3_BUCKET"
echo "  prefix=$prefix_slash"
echo "  app=$APP_NAME"
echo "  retention_days=$S3_RETENTION_DAYS (delete backup dates older than $cutoff)"
echo "  dry_run=$DRY_RUN"

list_cmd=("$AWS_BIN" "${AWS_ARGS[@]}" s3 ls "s3://$S3_BUCKET/$prefix_slash" --recursive)
if [[ "${#AWS_ENV[@]}" -gt 0 ]]; then
  list_cmd=(env "${AWS_ENV[@]}" "${list_cmd[@]}")
fi

delete_cmd_base=("$AWS_BIN" "${AWS_ARGS[@]}" s3 rm)
if [[ "${#AWS_ENV[@]}" -gt 0 ]]; then
  delete_cmd_base=(env "${AWS_ENV[@]}" "${delete_cmd_base[@]}")
fi

to_delete="$(
  "${list_cmd[@]}" 2>/dev/null | python3 - "$APP_NAME" "$cutoff" <<'PY'
import os, re, sys
app = sys.argv[1]
cutoff = sys.argv[2]  # YYYY-MM-DD
pat = re.compile(rf'^{re.escape(app)}_(\d{{4}}-\d{{2}}-\d{{2}})_\d{{6}}\.dump$')
for line in sys.stdin:
  parts = line.strip().split()
  if len(parts) < 4:
    continue
  key = parts[3]
  bn = os.path.basename(key)
  m = pat.match(bn)
  if not m:
    continue
  d = m.group(1)
  if d < cutoff:
    print(key)
PY
)"

if [[ -z "$to_delete" ]]; then
  echo "No old objects to delete."
  exit 0
fi

count=0
while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  count=$((count + 1))
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY_RUN delete: s3://$S3_BUCKET/$key"
  else
    "${delete_cmd_base[@]}" "s3://$S3_BUCKET/$key" >/dev/null
    echo "Deleted: s3://$S3_BUCKET/$key"
  fi
done <<<"$to_delete"

echo "Deleted objects: $count"

