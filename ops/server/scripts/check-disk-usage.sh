#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${1:-ops/server/.deploy.env}"
if (( $# > 0 )); then shift; fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a
[[ ! -r "$ENV_FILE" ]] || source "$ENV_FILE"
[[ ! -r /etc/tuition-scheduler/monitor.env ]] || source /etc/tuition-scheduler/monitor.env
set +a
exec python3 "$SCRIPT_DIR/storage_health.py" "$@"
