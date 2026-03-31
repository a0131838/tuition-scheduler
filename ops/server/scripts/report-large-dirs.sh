#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [[ -r "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -n "${APP_DIR:-}" ]] && [[ -d "${APP_DIR:-}" ]]; then
  REPO_ROOT="$APP_DIR"
fi

REPORT_TARGETS_RAW="${REPORT_TARGETS_RAW:-$REPO_ROOT/public/uploads
$REPO_ROOT/ops/logs
$REPO_ROOT/.next/cache}"
MAX_DEPTH="${MAX_DEPTH:-2}"
TOP_N="${TOP_N:-20}"

echo "Large directory report at $(date -Iseconds)"
while IFS= read -r target; do
  [[ -z "$target" ]] && continue
  if [[ ! -e "$target" ]]; then
    echo
    echo "== $target (missing) =="
    continue
  fi
  echo
  echo "== $target =="
  du -x -h -d "$MAX_DEPTH" "$target" 2>/dev/null | sort -hr | head -n "$TOP_N"
done <<< "$REPORT_TARGETS_RAW"
