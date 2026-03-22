#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CFG_FILE="${1:-$ROOT_DIR/server-handoff.env}"
BRANCH_ARG="${2:-}"

if [[ ! -f "$CFG_FILE" ]]; then
  echo "Missing config: $CFG_FILE"
  echo "Create it from: $ROOT_DIR/server-handoff.env.example"
  exit 1
fi

# shellcheck disable=SC1090
source "$CFG_FILE"

BRANCH="${BRANCH_ARG:-${DEFAULT_BRANCH:-}}"

for key in SSH_HOST SSH_PORT SSH_USER SSH_KEY_PATH APP_DIR APP_NAME DEPLOY_ENV_FILE; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required config: $key"
    exit 1
  fi
done

if [[ -z "$BRANCH" ]]; then
  echo "Missing branch. Set DEFAULT_BRANCH in config or pass arg #2."
  exit 1
fi

if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key not found: $SSH_KEY_PATH"
  exit 1
fi

SSH_CMD=(ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new -p "$SSH_PORT" "$SSH_USER@$SSH_HOST")

echo "Deploy branch: $BRANCH"
echo "Target: $SSH_USER@$SSH_HOST:$APP_DIR"

"${SSH_CMD[@]}" "set -euo pipefail; cd '$APP_DIR'; git fetch origin; git checkout '$BRANCH'; git reset --hard 'origin/$BRANCH'; bash ops/server/scripts/deploy_app.sh '$DEPLOY_ENV_FILE'"

echo
echo "Deploy done. Running quick check..."
bash "$ROOT_DIR/scripts/quick_check.sh" "$CFG_FILE"

