#!/bin/zsh
set -euo pipefail

ROOT="/Users/zhw-111/Documents/New project/tuition-scheduler"
LOG_DIR="$ROOT/ops/logs"
RECOVERY_LOG="$LOG_DIR/openclaw-recovery.log"
STATE_DIR="$LOG_DIR/report-delivery"
GATEWAY_LOG="/Users/zhw-111/.openclaw/logs/gateway.log"
UID_VALUE="$(id -u)"
GATEWAY_LABEL="ai.openclaw.gateway"

mkdir -p "$LOG_DIR" "$STATE_DIR"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$RECOVERY_LOG"
}

gateway_state() {
  launchctl print "gui/${UID_VALUE}/${GATEWAY_LABEL}" 2>/dev/null | awk -F'= ' '/state =/ {print $2; exit}'
}

last_wecom_signal() {
  [[ -f "$GATEWAY_LOG" ]] || return 0
  tail -n 200 "$GATEWAY_LOG" | awk '
    /Authentication successful|Max reconnect attempts reached|WebSocket not connected, unable to send data|WSClient not connected/ {
      line = $0
    }
    END {
      print line
    }
  '
}

restart_gateway() {
  log "Restarting OpenClaw gateway"
  launchctl kickstart -k "gui/${UID_VALUE}/${GATEWAY_LABEL}" >> "$RECOVERY_LOG" 2>&1 || log "Gateway restart command failed"
  sleep 5
}

ensure_gateway_healthy() {
  local state
  state="$(gateway_state)"
  if [[ "$state" != "running" ]]; then
    log "Gateway state is '${state:-missing}', requesting restart"
    restart_gateway
    return
  fi

  local last_signal
  last_signal="$(last_wecom_signal)"
  if [[ -n "$last_signal" && "$last_signal" != *"Authentication successful"* ]]; then
    log "Latest WeCom signal is unhealthy: $last_signal"
    restart_gateway
  fi
}

job_needs_catchup() {
  local state_file="$1"
  local threshold="$2"
  local now_hhmm today last_day

  now_hhmm="$(date '+%H%M')"
  if (( 10#$now_hhmm < 10#$threshold )); then
    return 1
  fi

  today="$(date '+%Y-%m-%d')"
  if [[ ! -f "$state_file" ]]; then
    return 0
  fi

  last_day="$(python3 - "$state_file" <<'PY'
import json, sys
path = sys.argv[1]
try:
    with open(path, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    sent_at = str(data.get('sentAt', ''))
    print(sent_at[:10])
except Exception:
    print('')
PY
)"
  [[ "$last_day" != "$today" ]]
}

attempt_file_for() {
  local name="$1"
  echo "$STATE_DIR/.attempt-${name}"
}

attempt_allowed() {
  local name="$1"
  local file last_attempt now_epoch

  file="$(attempt_file_for "$name")"
  if [[ ! -f "$file" ]]; then
    return 0
  fi

  last_attempt="$(cat "$file" 2>/dev/null || true)"
  now_epoch="$(date '+%s')"
  [[ -z "$last_attempt" ]] && return 0
  (( now_epoch - last_attempt >= 1200 ))
}

mark_attempt() {
  local name="$1"
  date '+%s' > "$(attempt_file_for "$name")"
}

catch_up_job_if_needed() {
  local label="$1"
  local threshold="$2"
  local state_file="$3"
  local name="$4"

  if job_needs_catchup "$state_file" "$threshold"; then
    if ! attempt_allowed "$name"; then
      log "Skipping ${name} catch-up because it is in cooldown"
      return
    fi

    mark_attempt "$name"
    log "Catching up ${name} via ${label}"
    launchctl kickstart -k "gui/${UID_VALUE}/${label}" >> "$RECOVERY_LOG" 2>&1 || log "Catch-up failed for ${name}"
    sleep 6
  fi
}

ensure_gateway_healthy
catch_up_job_if_needed "com.zhw.tuition.daily-risk-report" "0900" "$STATE_DIR/generate-daily-risk-report.json" "daily-risk-report"
catch_up_job_if_needed "com.zhw.tuition.ticket-opening-patrol" "0930" "$STATE_DIR/generate-ticket-opening-patrol.json" "ticket-opening-patrol"
catch_up_job_if_needed "com.zhw.tuition.employee-miss-tracking" "1800" "$STATE_DIR/generate-employee-miss-report.json" "employee-miss-tracking"
catch_up_job_if_needed "com.zhw.tuition.finance-anomaly-summary" "1815" "$STATE_DIR/generate-finance-anomaly-report.json" "finance-anomaly-summary"

log "Recovery check complete"
