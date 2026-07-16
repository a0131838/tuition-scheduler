#!/usr/bin/env bash
set -euo pipefail

# Complete local release path:
#   guarded preflight -> GitHub push -> server deploy -> version/health checks.
# Use --check to run every read-only preflight without pushing or deploying.

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(git -C "$SERVER_DIR" rev-parse --show-toplevel)"
DEFAULT_CFG="$SERVER_DIR/server-handoff.env"
MODE="release"
POSITIONAL=()

usage() {
  cat <<'EOF'
Usage:
  bash ops/server/scripts/release_to_server.sh [config] [branch] [--check]

Examples:
  bash ops/server/scripts/release_to_server.sh --check
  bash ops/server/scripts/release_to_server.sh
  bash ops/server/scripts/release_to_server.sh ops/server/server-handoff.env feat/strict-superadmin-availability-bypass
EOF
}

fail() {
  echo "RELEASE BLOCKED: $*" >&2
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --check)
      MODE="check"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      fail "unknown option: $arg"
      ;;
    *)
      POSITIONAL+=("$arg")
      ;;
  esac
done

if (( ${#POSITIONAL[@]} > 2 )); then
  usage
  fail "expected at most config and branch arguments"
fi

CFG_FILE="${POSITIONAL[0]:-${SGT_SERVER_HANDOFF_CONFIG:-$DEFAULT_CFG}}"

# Git worktrees do not copy ignored local config. Reuse the main worktree config.
if [[ ! -f "$CFG_FILE" && "$CFG_FILE" == "$DEFAULT_CFG" ]]; then
  COMMON_DIR="$(git -C "$REPO_ROOT" rev-parse --git-common-dir)"
  if [[ "$COMMON_DIR" != /* ]]; then
    COMMON_DIR="$REPO_ROOT/$COMMON_DIR"
  fi
  SHARED_CFG="$(cd "$COMMON_DIR/.." && pwd)/ops/server/server-handoff.env"
  if [[ -f "$SHARED_CFG" ]]; then
    CFG_FILE="$SHARED_CFG"
  fi
fi

[[ -f "$CFG_FILE" ]] || fail "missing config: $CFG_FILE (create it from $SERVER_DIR/server-handoff.env.example)"

# shellcheck disable=SC1090
source "$CFG_FILE"

BRANCH="${POSITIONAL[1]:-${DEFAULT_BRANCH:-}}"
REMOTE_NAME="${GIT_REMOTE_NAME:-origin}"

for key in SSH_HOST SSH_PORT SSH_USER SSH_KEY_PATH APP_DIR APP_NAME HEALTH_URL DEPLOY_ENV_FILE; do
  [[ -n "${!key:-}" ]] || fail "missing required config: $key"
done

[[ -n "$BRANCH" ]] || fail "missing branch; set DEFAULT_BRANCH or pass the branch argument"
[[ -f "$SSH_KEY_PATH" ]] || fail "server SSH key not found: $SSH_KEY_PATH"

cd "$REPO_ROOT"

echo "== Release preflight =="
echo "Mode: $MODE"
echo "Local commit: $(git rev-parse HEAD)"
echo "Target branch: $BRANCH"
echo "Server: $SSH_USER@$SSH_HOST:$APP_DIR"

TRACKED_CHANGES="$(git status --porcelain --untracked-files=no)"
if [[ -n "$TRACKED_CHANGES" ]]; then
  echo "$TRACKED_CHANGES" >&2
  fail "tracked changes exist; commit only the intended release files before publishing"
fi

REMOTE_URL="$(git remote get-url "$REMOTE_NAME" 2>/dev/null || true)"
case "$REMOTE_URL" in
  git@github.com:*|ssh://git@github.com/*)
    ;;
  *)
    fail "Git remote '$REMOTE_NAME' must use GitHub SSH, not HTTPS. Run: git remote set-url $REMOTE_NAME git@github.com:a0131838/tuition-scheduler.git"
    ;;
esac

GITHUB_PORT="$(ssh -G github.com 2>/dev/null | awk '$1 == "port" { print $2; exit }')"
[[ "$GITHUB_PORT" == "443" ]] || fail "github.com must use SSH port 443 in ~/.ssh/config; current resolved port is ${GITHUB_PORT:-unknown}"

GITHUB_AUTH="$(ssh -T -o BatchMode=yes -o ConnectTimeout=15 git@github.com 2>&1 || true)"
if ! printf '%s\n' "$GITHUB_AUTH" | grep -q 'successfully authenticated'; then
  printf '%s\n' "$GITHUB_AUTH" >&2
  fail "GitHub SSH authentication failed; add the local public key to the GitHub account before release"
fi

echo "GitHub SSH: authenticated on port 443"

git fetch "$REMOTE_NAME" "$BRANCH:refs/remotes/$REMOTE_NAME/$BRANCH"
bash ops/server/scripts/verify_release_docs.sh HEAD

if ! git merge-base --is-ancestor "$REMOTE_NAME/$BRANCH" HEAD; then
  fail "origin/$BRANCH contains commits not present in local HEAD; integrate them before release"
fi

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_BEFORE="$(git rev-parse "$REMOTE_NAME/$BRANCH")"
echo "Remote before release: $REMOTE_BEFORE"

if [[ "$MODE" == "check" ]]; then
  echo "CHECK PASSED: GitHub push and server deploy were not executed."
  exit 0
fi

echo
echo "== Push to GitHub =="
git push "$REMOTE_NAME" "HEAD:$BRANCH"

REMOTE_AFTER="$(git ls-remote "$REMOTE_NAME" "refs/heads/$BRANCH" | awk 'NR == 1 { print $1 }')"
[[ "$REMOTE_AFTER" == "$LOCAL_HEAD" ]] || fail "GitHub verification failed: local=$LOCAL_HEAD remote=${REMOTE_AFTER:-missing}"
echo "GitHub commit verified: $REMOTE_AFTER"

echo
echo "== Deploy server =="
bash "$SERVER_DIR/scripts/quick_deploy.sh" "$CFG_FILE" "$BRANCH"

SSH_CMD=(ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new -p "$SSH_PORT" "$SSH_USER@$SSH_HOST")
SERVER_HEAD="$("${SSH_CMD[@]}" "cd '$APP_DIR' && git rev-parse HEAD")"
[[ "$SERVER_HEAD" == "$LOCAL_HEAD" ]] || fail "server version mismatch: local=$LOCAL_HEAD server=$SERVER_HEAD"

SERVER_PID="$("${SSH_CMD[@]}" "pm2 pid '$APP_NAME' | tail -n 1" | tr -d '[:space:]')"
[[ "$SERVER_PID" =~ ^[1-9][0-9]*$ ]] || fail "PM2 process '$APP_NAME' is not online"

HEALTH_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$HEALTH_URL")"
[[ "$HEALTH_CODE" == "200" ]] || fail "health check failed: $HEALTH_URL returned $HEALTH_CODE"

echo
echo "RELEASE COMPLETE"
echo "Local/GitHub/server commit: $LOCAL_HEAD"
echo "PM2 PID: $SERVER_PID"
echo "Health: $HEALTH_CODE $HEALTH_URL"
