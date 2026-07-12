#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/home/ubuntu/apps/tuition-scheduler}"
LOG_DIR="$APP_DIR/ops/logs"
MARKER="# tuition-scheduler-miniapp-course-reminders"
QUEUE_LOG="$LOG_DIR/miniapp-course-reminder-queue.log"
SEND_LOG="$LOG_DIR/miniapp-course-reminder-send.log"
SERVICE_SEND_LOG="$LOG_DIR/miniapp-service-notification-send.log"

mkdir -p "$LOG_DIR"
ENTRY="*/5 * * * * mkdir -p '$LOG_DIR' && cd '$APP_DIR' && /usr/bin/npm run miniapp:queue-course-reminders >> '$QUEUE_LOG' 2>&1 && /usr/bin/npm run miniapp:send-course-reminders >> '$SEND_LOG' 2>&1 && /usr/bin/npm run miniapp:send-service-notifications >> '$SERVICE_SEND_LOG' 2>&1 $MARKER"

{
  crontab -l 2>/dev/null | grep -vF "$MARKER" || true
  echo "$ENTRY"
} | crontab -

echo "Miniapp course reminder cron installed:"
echo "$ENTRY"
