#!/usr/bin/env bash
set -euo pipefail

HOST=""
USER_NAME="ubuntu"
KEY_PATH="${HOME}/.ssh/id_rsa"
REMOTE_DIR="/home/ubuntu/apps/tuition-scheduler"
RUN_BUILD="false"
STRICT="false"
HEALTH_URL=""
CHECK_PATHS=("app" "lib" "prisma")

usage() {
  cat <<'EOF'
Usage:
  bash ops/server/scripts/deploy_consistency_check.sh [options]

Options:
  --host <host>           Remote host (required for remote hash compare)
  --user <user>           SSH user (default: ubuntu)
  --key <path>            SSH private key path (default: ~/.ssh/id_rsa)
  --remote-dir <path>     Remote project dir (default: /home/ubuntu/apps/tuition-scheduler)
  --build                 Run local "npm run build" before compare
  --health-url <url>      Run HTTP status checks on this base URL
  --strict                Exit non-zero if hash drift or health check failure
  --help                  Show help

Examples:
  bash ops/server/scripts/deploy_consistency_check.sh --build
  bash ops/server/scripts/deploy_consistency_check.sh \
    --host 43.128.46.115 --user ubuntu --key ~/Documents/sgt系统/.ssh/tuition_scheduler888.pem \
    --health-url https://sgtmanage.com --strict
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="${2:-}"; shift 2 ;;
    --user) USER_NAME="${2:-}"; shift 2 ;;
    --key) KEY_PATH="${2:-}"; shift 2 ;;
    --remote-dir) REMOTE_DIR="${2:-}"; shift 2 ;;
    --build) RUN_BUILD="true"; shift ;;
    --health-url) HEALTH_URL="${2:-}"; shift 2 ;;
    --strict) STRICT="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

require_cmd find
require_cmd sort
require_cmd awk
require_cmd comm

if command -v shasum >/dev/null 2>&1; then
  SHA_LOCAL_CMD=(shasum -a 1)
elif command -v sha1sum >/dev/null 2>&1; then
  SHA_LOCAL_CMD=(sha1sum)
else
  echo "Missing shasum/sha1sum for local hash check."
  exit 1
fi

if [[ "$RUN_BUILD" == "true" ]]; then
  echo "[1/3] Local build check..."
  npm run build
  echo "Local build OK."
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
LOCAL_LIST="$TMP_DIR/local_files.txt"
LOCAL_SHA="$TMP_DIR/local_sha.txt"

echo "[2/3] Local hash snapshot..."
find "${CHECK_PATHS[@]}" -type f ! -name '._*' | sort > "$LOCAL_LIST"
while IFS= read -r file; do
  "${SHA_LOCAL_CMD[@]}" "$file"
done < "$LOCAL_LIST" | awk '{print $1"  "$2}' > "$LOCAL_SHA"
echo "Local files: $(wc -l < "$LOCAL_LIST" | tr -d ' ')"

HASH_DRIFT_COUNT=0
if [[ -n "$HOST" ]]; then
  require_cmd ssh
  REMOTE_LIST="$TMP_DIR/remote_files.txt"
  REMOTE_SHA="$TMP_DIR/remote_sha.txt"
  DIFF_ONLY_LOCAL="$TMP_DIR/diff_only_local.txt"
  DIFF_ONLY_REMOTE="$TMP_DIR/diff_only_remote.txt"
  DIFF_HASH="$TMP_DIR/diff_hash.txt"

  echo "Remote hash snapshot: ${USER_NAME}@${HOST}:${REMOTE_DIR}"
  ssh -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new "${USER_NAME}@${HOST}" \
    "cd '$REMOTE_DIR' && find ${CHECK_PATHS[*]} -type f ! -name '._*' | sort" > "$REMOTE_LIST"
  ssh -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new "${USER_NAME}@${HOST}" \
    "cd '$REMOTE_DIR' && find ${CHECK_PATHS[*]} -type f ! -name '._*' | sort | while IFS= read -r f; do sha1sum \"\$f\"; done | awk '{print \$1\"  \"\$2}'" > "$REMOTE_SHA"

  # Normalize local hash format to sha1sum style for stable compare.
  cat "$LOCAL_SHA" | sort > "$TMP_DIR/local_sha_sorted.txt"
  cat "$REMOTE_SHA" | sort > "$TMP_DIR/remote_sha_sorted.txt"

  # Compare file list set.
  sort "$LOCAL_LIST" > "$TMP_DIR/local_files_sorted.txt"
  sort "$REMOTE_LIST" > "$TMP_DIR/remote_files_sorted.txt"

  comm -23 "$TMP_DIR/local_files_sorted.txt" "$TMP_DIR/remote_files_sorted.txt" > "$DIFF_ONLY_LOCAL"
  comm -13 "$TMP_DIR/local_files_sorted.txt" "$TMP_DIR/remote_files_sorted.txt" > "$DIFF_ONLY_REMOTE"

  # Files present both sides but hash differs.
  python3 - "$TMP_DIR/local_sha_sorted.txt" "$TMP_DIR/remote_sha_sorted.txt" "$DIFF_HASH" <<'PY'
import sys
from pathlib import Path
local_path, remote_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
def load(p):
  m = {}
  for line in Path(p).read_text().splitlines():
    if "  " not in line:
      continue
    h, f = line.split("  ", 1)
    m[f] = h
  return m
L = load(local_path)
R = load(remote_path)
diff = sorted([f for f in set(L).intersection(R) if L[f] != R[f]])
Path(out_path).write_text("\n".join(diff))
PY

  HASH_DRIFT_COUNT="$(wc -l < "$DIFF_HASH" | tr -d ' ')"
  ONLY_LOCAL_COUNT="$(wc -l < "$DIFF_ONLY_LOCAL" | tr -d ' ')"
  ONLY_REMOTE_COUNT="$(wc -l < "$DIFF_ONLY_REMOTE" | tr -d ' ')"

  echo "Remote compare summary:"
  echo "  only_local_files  : ${ONLY_LOCAL_COUNT}"
  echo "  only_remote_files : ${ONLY_REMOTE_COUNT}"
  echo "  hash_drift_files  : ${HASH_DRIFT_COUNT}"

  if [[ "$ONLY_LOCAL_COUNT" != "0" ]]; then
    echo "  Sample only-local files:"
    sed -n '1,10p' "$DIFF_ONLY_LOCAL" | sed 's/^/    - /'
  fi
  if [[ "$ONLY_REMOTE_COUNT" != "0" ]]; then
    echo "  Sample only-remote files:"
    sed -n '1,10p' "$DIFF_ONLY_REMOTE" | sed 's/^/    - /'
  fi
  if [[ "$HASH_DRIFT_COUNT" != "0" ]]; then
    echo "  Sample hash-drift files:"
    sed -n '1,20p' "$DIFF_HASH" | sed 's/^/    - /'
  fi
else
  echo "Skip remote compare (no --host provided)."
fi

HEALTH_FAIL=0
if [[ -n "$HEALTH_URL" ]]; then
  require_cmd curl
  echo "[3/3] Health checks..."
  BASE="${HEALTH_URL%/}"
  URLS=(
    "/admin/login"
    "/admin"
    "/admin/todos"
    "/admin/receipts-approvals"
    "/admin/schedule"
  )
  for p in "${URLS[@]}"; do
    code="$(curl -k -sS -o /dev/null -w '%{http_code}' -I "${BASE}${p}" || true)"
    echo "  ${code}  ${BASE}${p}"
    case "$code" in
      200|301|302|303|307|308) ;;
      *) HEALTH_FAIL=1 ;;
    esac
  done
fi

if [[ "$STRICT" == "true" ]]; then
  if [[ "$HASH_DRIFT_COUNT" != "0" || "$HEALTH_FAIL" == "1" ]]; then
    echo "Consistency check FAILED in strict mode."
    exit 2
  fi
fi

echo "Consistency check done."
