#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-ops/server/.deploy.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ "$(id -un)" == "root" ]]; then
  echo "Run as deploy user, not root."
  exit 1
fi

echo "Deploy: $APP_NAME ($BRANCH) -> $DOMAIN"
bash ops/server/scripts/deploy_app.sh "$ENV_FILE"
bash ops/server/scripts/health_check.sh "$ENV_FILE"
echo "Done."

