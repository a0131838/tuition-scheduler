#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_PREFIX="[ledger-integrity]"

if [[ -r "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
elif [[ -f "$ENV_FILE" ]]; then
  echo "$LOG_PREFIX WARN: env file exists but is not readable: $ENV_FILE" >&2
fi

if [[ -n "${APP_DIR:-}" ]] && [[ -d "${APP_DIR:-}" ]]; then
  REPO_ROOT="$APP_DIR"
fi

TSX_BIN="${TSX_BIN:-$REPO_ROOT/node_modules/.bin/tsx}"
REPORT_SCRIPT="$REPO_ROOT/scripts/reconciliation/daily-ledger-integrity.ts"

if [[ ! -x "$TSX_BIN" ]]; then
  echo "$LOG_PREFIX ERROR: tsx not found at $TSX_BIN" >&2
  exit 2
fi
if [[ ! -f "$REPORT_SCRIPT" ]]; then
  echo "$LOG_PREFIX ERROR: report script not found: $REPORT_SCRIPT" >&2
  exit 2
fi

timeout="${CURL_TIMEOUT_SECONDS:-10}"

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])'
}

send_webhook_alert() {
  local url="$1"
  local msg="$2"

  if [[ "$url" == https://qyapi.weixin.qq.com/* ]]; then
    curl -sS -m "$timeout" -H "Content-Type: application/json" \
      -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$(printf '%s' "$msg" | tr -d '\r' | json_escape)\"}}" \
      "$url" >/dev/null 2>&1 || true
    return 0
  fi

  curl -sS -m "$timeout" -H "Content-Type: application/json" \
    -d "{\"message\":\"$(printf '%s' "$msg" | tr -d '\r' | json_escape)\"}" \
    "$url" >/dev/null 2>&1 || true
}

OUT_FILE="$(mktemp)"
trap 'rm -f "$OUT_FILE"' EXIT

set +e
(
  cd "$REPO_ROOT"
  "$TSX_BIN" "$REPORT_SCRIPT"
) >"$OUT_FILE" 2>&1
exit_code=$?
set -e

cat "$OUT_FILE"

if [[ "$exit_code" -ne 0 ]]; then
  msg="Tuition Scheduler ledger integrity job FAILED on $(hostname) at $(date -Iseconds)"
  msg+=$'\n'"exitCode=$exit_code"
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    send_webhook_alert "$ALERT_WEBHOOK_URL" "$msg"
  fi
  if [[ -n "${ALERT_EMAIL_TO:-}" ]] && command -v mail >/dev/null 2>&1; then
    echo -e "$msg" | mail -s "Ledger integrity job FAILED: $(hostname)" "$ALERT_EMAIL_TO" || true
  fi
  exit "$exit_code"
fi

read -r total_issues mismatch_count no_package_count detail_path summary_path < <(
  python3 - "$OUT_FILE" <<'PY'
import json
import pathlib
import re
import sys

txt = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore")
m = re.search(r'(\{[\s\S]*\})\s*$', txt)
if not m:
    print("0 0 0 - -")
    raise SystemExit(0)
try:
    obj = json.loads(m.group(1))
except Exception:
    print("0 0 0 - -")
    raise SystemExit(0)
print(
    int(obj.get("totalIssueCount", 0)),
    int(obj.get("mismatchCount", 0)),
    int(obj.get("noPackageDeductCount", 0)),
    str(obj.get("detailPath", "-")),
    str(obj.get("summaryPath", "-")),
)
PY
)

if [[ "${total_issues:-0}" -gt 0 ]]; then
  msg="Tuition Scheduler ledger integrity ALERT on $(hostname) at $(date -Iseconds)"
  msg+=$'\n'"totalIssueCount=${total_issues} (mismatch=${mismatch_count}, noPackageDeduct=${no_package_count})"
  msg+=$'\n'"detail=${detail_path}"
  msg+=$'\n'"summary=${summary_path}"
  sent_any=0
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    send_webhook_alert "$ALERT_WEBHOOK_URL" "$msg"
    sent_any=1
  fi
  if [[ -n "${ALERT_EMAIL_TO:-}" ]] && command -v mail >/dev/null 2>&1; then
    echo -e "$msg" | mail -s "Ledger integrity ALERT: ${total_issues} issues" "$ALERT_EMAIL_TO" || true
    sent_any=1
  fi
  if [[ "$sent_any" -eq 1 ]]; then
    echo "$LOG_PREFIX alert sent (issues=$total_issues)"
  else
    echo "$LOG_PREFIX issues detected (issues=$total_issues), but no alert channel configured"
  fi
else
  echo "$LOG_PREFIX ok (issues=0)"
fi
