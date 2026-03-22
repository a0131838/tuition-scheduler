#!/bin/zsh
set -euo pipefail

if [[ "$(id -u)" != "0" ]]; then
  cat <<'EOF'
This helper needs admin privileges because macOS power settings are system-wide.

Run:
  sudo /Users/zhw-111/Documents/New project/tuition-scheduler/ops/codex/apply-mac-mini-power-settings.sh
EOF
  exit 1
fi

pmset -a sleep 0
pmset -a displaysleep 30
pmset -a autorestart 1
pmset -a womp 1
pmset -a tcpkeepalive 1
pmset -a powernap 1
pmset -a disksleep 0
pmset -g custom
