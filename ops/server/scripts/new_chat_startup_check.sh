#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SERVER_DIR/../.." && pwd)"
DOCS_DIR="$REPO_ROOT/docs"
TASKS_DIR="$DOCS_DIR/tasks"
CFG_FILE="${1:-$SERVER_DIR/server-handoff.env}"

if [[ ! -f "$CFG_FILE" ]]; then
  echo "Missing config: $CFG_FILE"
  echo "Create it from: $SERVER_DIR/server-handoff.env.example"
  exit 1
fi

# shellcheck disable=SC1090
source "$CFG_FILE"

for key in SSH_HOST SSH_PORT SSH_USER SSH_KEY_PATH APP_DIR APP_NAME HEALTH_URL DEFAULT_BRANCH; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required config: $key"
    exit 1
  fi
done

if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key not found: $SSH_KEY_PATH"
  exit 1
fi

SSH_CMD=(ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new -p "$SSH_PORT" "$SSH_USER@$SSH_HOST")

cd "$REPO_ROOT"
git fetch origin "$DEFAULT_BRANCH" --quiet

LOCAL_HEAD="$(git rev-parse --short HEAD)"
LOCAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
ORIGIN_HEAD="$(git rev-parse --short "origin/$DEFAULT_BRANCH")"
ORIGIN_BRANCH="$DEFAULT_BRANCH"
REMOTE_HEAD="$("${SSH_CMD[@]}" "cd '$APP_DIR' && git rev-parse --short HEAD")"
REMOTE_BRANCH="$("${SSH_CMD[@]}" "cd '$APP_DIR' && git rev-parse --abbrev-ref HEAD")"

MODIFIED_COUNT="$(git status --porcelain | grep -Ev '^\?\?' | wc -l | tr -d ' ')"
UNTRACKED_COUNT="$(git status --porcelain | grep -E '^\?\?' | wc -l | tr -d ' ')"

LATEST_TASK="$(ls -1t "$TASKS_DIR"/TASK-*.md 2>/dev/null | head -n 1 || true)"

echo "== Startup Check =="
echo "date: $(date '+%Y-%m-%d %H:%M:%S %z')"
echo "repo: $REPO_ROOT"
echo
echo "== Version Alignment =="
echo "local:   $LOCAL_HEAD ($LOCAL_BRANCH)"
echo "origin:  $ORIGIN_HEAD ($ORIGIN_BRANCH)"
echo "server:  $REMOTE_HEAD ($REMOTE_BRANCH)"
if [[ "$LOCAL_HEAD" == "$ORIGIN_HEAD" && "$ORIGIN_HEAD" == "$REMOTE_HEAD" ]]; then
  echo "status:  ALIGNED"
else
  echo "status:  MISMATCH"
fi
echo
echo "== Working Tree =="
echo "modified_tracked: $MODIFIED_COUNT"
echo "untracked:        $UNTRACKED_COUNT"
echo
echo "== Health =="
curl -sS -o /dev/null -w "http_code=%{http_code} url=%{url_effective}\n" "$HEALTH_URL"
echo
echo "== Docs Snapshot =="
echo "[SERVER-HANDOFF.md]"
sed -n '1,80p' "$DOCS_DIR/SERVER-HANDOFF.md"
echo
echo "[CHANGELOG-LIVE.md] (tail)"
tail -n 80 "$DOCS_DIR/CHANGELOG-LIVE.md"
echo
echo "[RELEASE-BOARD.md] (tail)"
tail -n 80 "$DOCS_DIR/RELEASE-BOARD.md"
echo
if [[ -n "$LATEST_TASK" && -f "$LATEST_TASK" ]]; then
  echo "[LATEST TASK] $LATEST_TASK"
  sed -n '1,160p' "$LATEST_TASK"
else
  echo "[LATEST TASK] none found under $TASKS_DIR"
fi
