#!/usr/bin/env bash
set -euo pipefail

# Minimal HTTP monitor with optional webhook/email alerts.
#
# Config file (optional): /etc/tuition-scheduler/monitor.env
# - MONITOR_URLS: space-separated URLs to check
# - ALERT_WEBHOOK_URL: webhook URL to notify on failure
#   - WeCom group bot (qyapi.weixin.qq.com): POST JSON {"msgtype":"text","text":{"content":"..."}}
#   - Generic webhook: POST JSON {"message":"..."}
# - ALERT_EMAIL_TO: if set and `mail` exists, send an email on failure
# - ALERT_FROM: optional email from
#
# Exit code:
# - 0: all OK
# - 1: any failure (still sends alert if configured)

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

OPS_ENV="/etc/tuition-scheduler/monitor.env"
if [[ -f "$OPS_ENV" ]]; then
  # Allow one-off overrides like:
  #   MONITOR_URLS=https://127.0.0.1:1 ./monitor_http.sh ...
  # even if monitor.env contains `MONITOR_URLS=` (empty).
  _MONITOR_URLS_PRE="${MONITOR_URLS-__unset__}"
  # shellcheck disable=SC1090
  source "$OPS_ENV"
  if [[ "${_MONITOR_URLS_PRE}" != "__unset__" ]] && [[ -n "${_MONITOR_URLS_PRE}" ]] && [[ -z "${MONITOR_URLS:-}" ]]; then
    MONITOR_URLS="${_MONITOR_URLS_PRE}"
  fi
fi

DOMAIN="${DOMAIN:-}"
if [[ -z "${MONITOR_URLS:-}" ]]; then
  if [[ -n "$DOMAIN" ]]; then
    MONITOR_URLS="https://$DOMAIN/ https://$DOMAIN/admin/login https://$DOMAIN/admin https://$DOMAIN/admin/todos https://$DOMAIN/teacher/availability"
  else
    echo "MONITOR_URLS is empty and DOMAIN is not set."
    exit 1
  fi
fi

timeout="${CURL_TIMEOUT_SECONDS:-10}"

json_escape() {
  # Prints JSON-escaped content without surrounding quotes.
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])'
}

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
    return 0
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
    return 0
  fi
  python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())'
}

should_send_alert() {
  local fingerprint="$1"

  local cooldown="${ALERT_COOLDOWN_SECONDS:-1800}"
  local state_dir="${ALERT_STATE_DIR:-/var/tmp/tuition-scheduler}"
  local state_file="$state_dir/monitor_http_last_alert"
  local now last_ts last_fp

  # No cooldown or invalid -> always send.
  if ! [[ "$cooldown" =~ ^[0-9]+$ ]] || [[ "$cooldown" -le 0 ]]; then
    return 0
  fi

  mkdir -p "$state_dir" >/dev/null 2>&1 || true
  now="$(date +%s)"
  last_ts=""
  last_fp=""
  if [[ -f "$state_file" ]]; then
    read -r last_ts last_fp <"$state_file" || true
  fi

  if [[ -n "$last_ts" ]] && [[ "$last_ts" =~ ^[0-9]+$ ]] && [[ -n "$last_fp" ]]; then
    if [[ "$last_fp" == "$fingerprint" ]] && (( now - last_ts < cooldown )); then
      return 1
    fi
  fi

  printf '%s %s\n' "$now" "$fingerprint" >"$state_file" 2>/dev/null || true
  return 0
}

send_webhook_alert() {
  local url="$1"
  local msg="$2"

  # Don't fail the monitor if alert delivery fails.
  # WeCom group bots require `msgtype=text` payload.
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

is_ok_code() {
  local code="$1"
  case "$code" in
    200|201|202|204|301|302|303|307|308) return 0 ;;
    *) return 1 ;;
  esac
}

fails=()
while read -r url; do
  [[ -z "$url" ]] && continue
  # `curl -w` still prints "000" on some failures; avoid double-"000" by not using `|| echo`.
  code="$(curl -k -s -o /dev/null -m "$timeout" -w "%{http_code}" "$url" || true)"
  [[ -z "$code" ]] && code="000"
  if ! is_ok_code "$code"; then
    fails+=("$code $url")
  fi
done < <(printf '%s\n' $MONITOR_URLS)

if [[ "${#fails[@]}" -eq 0 ]]; then
  echo "monitor ok"
  exit 0
fi

msg="Tuition Scheduler monitor FAIL on $(hostname) at $(date -Iseconds)"
for f in "${fails[@]}"; do
  msg+=$'\n'"$f"
done

printf '%s\n' "$msg"

if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
  # De-duplicate alerts: same failures only notify once per cooldown window.
  fp="$(printf '%s\n' "${fails[@]}" | sha256)"
  if should_send_alert "$fp"; then
    send_webhook_alert "$ALERT_WEBHOOK_URL" "$msg"
  fi
fi

if [[ -n "${ALERT_EMAIL_TO:-}" ]] && command -v mail >/dev/null 2>&1; then
  subj="Tuition Scheduler monitor FAIL: $(hostname)"
  if [[ -n "${ALERT_FROM:-}" ]]; then
    echo -e "$msg" | mail -a "From: $ALERT_FROM" -s "$subj" "$ALERT_EMAIL_TO" || true
  else
    echo -e "$msg" | mail -s "$subj" "$ALERT_EMAIL_TO" || true
  fi
fi

exit 1
