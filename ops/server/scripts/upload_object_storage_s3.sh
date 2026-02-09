#!/usr/bin/env bash
set -euo pipefail

# Upload a file to S3-compatible object storage using AWS CLI.
#
# Required env (recommended to put in /etc/tuition-scheduler/backup.env):
# - S3_BUCKET
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
#
# Optional:
# - S3_PREFIX
# - AWS_DEFAULT_REGION
# - S3_ENDPOINT_URL (for Tencent COS or other S3-compatible)
# - S3_STORAGE_CLASS
# - S3_ADDRESSING_STYLE (virtual|path; default: auto)
#
# Usage:
#   bash upload_object_storage_s3.sh /path/to/file

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Usage: $0 /path/to/file"
  exit 2
fi

AWS_BIN="$(command -v aws 2>/dev/null || true)"
if [[ -z "$AWS_BIN" && -x /snap/bin/aws ]]; then
  AWS_BIN="/snap/bin/aws"
fi

if [[ -z "$AWS_BIN" ]]; then
  echo "Missing aws cli. Install on Ubuntu:"
  echo "  sudo apt-get update && sudo apt-get install -y awscli"
  echo "Or via snap (recommended on Ubuntu 24.04):"
  echo "  sudo snap install aws-cli --classic"
  exit 1
fi

S3_BUCKET="${S3_BUCKET:-}"
if [[ -z "$S3_BUCKET" ]]; then
  echo "Missing S3_BUCKET env"
  exit 1
fi

S3_PREFIX="${S3_PREFIX:-}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-hongkong}"
S3_ENDPOINT_URL="${S3_ENDPOINT_URL:-}"
S3_STORAGE_CLASS="${S3_STORAGE_CLASS:-}"
S3_ADDRESSING_STYLE="${S3_ADDRESSING_STYLE:-}"

BN="$(basename "$FILE")"
DEST="s3://${S3_BUCKET}"
if [[ -n "$S3_PREFIX" ]]; then
  DEST="${DEST}/${S3_PREFIX}"
fi
DEST="${DEST}/${BN}"

AWS_ARGS=(--region "$AWS_DEFAULT_REGION")
if [[ -n "$S3_ENDPOINT_URL" ]]; then
  AWS_ARGS+=(--endpoint-url "$S3_ENDPOINT_URL")
fi

CP_ARGS=()
if [[ -n "$S3_STORAGE_CLASS" ]]; then
  CP_ARGS+=(--storage-class "$S3_STORAGE_CLASS")
fi

AWS_CONFIG_FILE_TMP=""
cleanup() {
  [[ -n "$AWS_CONFIG_FILE_TMP" ]] && rm -f "$AWS_CONFIG_FILE_TMP" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Tencent COS rejects path-style requests; force virtual-hosted-style when using COS endpoints.
if [[ -z "$S3_ADDRESSING_STYLE" && "$S3_ENDPOINT_URL" == *"myqcloud.com"* ]]; then
  S3_ADDRESSING_STYLE="virtual"
fi

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

if [[ "${#AWS_ENV[@]}" -gt 0 ]]; then
  env "${AWS_ENV[@]}" "$AWS_BIN" "${AWS_ARGS[@]}" s3 cp "${CP_ARGS[@]}" "$FILE" "$DEST"
else
  "$AWS_BIN" "${AWS_ARGS[@]}" s3 cp "${CP_ARGS[@]}" "$FILE" "$DEST"
fi
echo "Uploaded: $DEST"
