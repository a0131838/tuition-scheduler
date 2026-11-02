#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${1:-/home/ubuntu/apps/tuition-scheduler}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
BEGIN='# BEGIN tuition-scheduler-sop-monthly-inventory'
END='# END tuition-scheduler-sop-monthly-inventory'
mkdir -p "$LOG_DIR"
ENTRY="20 8 1 * * cd '$APP_DIR' && /usr/bin/npm run sop:monthly-snapshot >> '$LOG_DIR/tuition-scheduler_sop_inventory.log' 2>&1"
{
  crontab -l 2>/dev/null | awk -v begin="$BEGIN" -v end="$END" '$0==begin {skip=1;next} $0==end {skip=0;next} !skip {print}' || true
  echo "$BEGIN"
  echo 'CRON_TZ=Asia/Singapore'
  echo "$ENTRY"
  echo "$END"
} | crontab -
echo 'Monthly SOP inventory snapshot scheduled at 08:20 Singapore time on the first day.'
