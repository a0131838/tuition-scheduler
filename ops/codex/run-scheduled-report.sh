#!/bin/zsh
set -euo pipefail

ROOT="/Users/zhw-111/Documents/New project/tuition-scheduler"
NODE_BIN="/Users/zhw-111/.nvm/versions/node/v24.14.0/bin/node"

if [[ $# -ne 4 ]]; then
  echo "Usage: run-scheduled-report.sh <agentId> <replyChannel> <replyTo> <generatorRelPath>" >&2
  exit 1
fi

cd "$ROOT"
"$NODE_BIN" ops/codex/send-scheduled-report.mjs "$1" "$2" "$3" "$4"
