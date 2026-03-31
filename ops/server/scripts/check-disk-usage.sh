#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_PREFIX="[disk-usage]"

if [[ -r "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
elif [[ -f "$ENV_FILE" ]]; then
  echo "$LOG_PREFIX WARN: env file exists but is not readable: $ENV_FILE" >&2
fi

if [[ -n "${APP_DIR:-}" ]] && [[ -d "${APP_DIR:-}" ]]; then
  REPO_ROOT="$APP_DIR"
fi

CHECK_PATHS_RAW="${CHECK_PATHS_RAW:-$REPO_ROOT
$REPO_ROOT/public/uploads}"
WARN_THRESHOLD_PERCENT="${WARN_THRESHOLD_PERCENT:-70}"
ALERT_THRESHOLD_PERCENT="${ALERT_THRESHOLD_PERCENT:-85}"
CRITICAL_THRESHOLD_PERCENT="${CRITICAL_THRESHOLD_PERCENT:-95}"
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

status="OK"
message_lines=()

while IFS= read -r target; do
  [[ -z "$target" ]] && continue
  if [[ ! -e "$target" ]]; then
    message_lines+=("skip $target (missing path)")
    continue
  fi

  usage="$(df -P "$target" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
  avail="$(df -hP "$target" | awk 'NR==2 {print $4}')"
  used_h="$(df -hP "$target" | awk 'NR==2 {print $3}')"
  mount_point="$(df -hP "$target" | awk 'NR==2 {print $6}')"

  level="ok"
  if (( usage >= CRITICAL_THRESHOLD_PERCENT )); then
    level="critical"
    status="CRITICAL"
  elif (( usage >= ALERT_THRESHOLD_PERCENT )); then
    [[ "$status" != "CRITICAL" ]] && status="ALERT"
    level="alert"
  elif (( usage >= WARN_THRESHOLD_PERCENT )); then
    [[ "$status" == "OK" ]] && status="WARN"
    level="warn"
  fi

  message_lines+=("$level path=$target usage=${usage}% used=$used_h avail=$avail mount=$mount_point")
done <<< "$CHECK_PATHS_RAW"

printf '%s\n' "${message_lines[@]}"

if [[ "$status" != "OK" ]]; then
  msg="Tuition Scheduler disk usage ${status} on $(hostname) at $(date -Iseconds)"
  msg+=$'\n'"$(printf '%s\n' "${message_lines[@]}")"
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    send_webhook_alert "$ALERT_WEBHOOK_URL" "$msg"
  fi
  if [[ -n "${ALERT_EMAIL_TO:-}" ]] && command -v mail >/dev/null 2>&1; then
    echo -e "$msg" | mail -s "Disk usage ${status}: $(hostname)" "$ALERT_EMAIL_TO" || true
  fi
fi
