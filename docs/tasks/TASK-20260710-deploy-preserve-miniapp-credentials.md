# TASK-20260710-deploy-preserve-miniapp-credentials

## Objective

Prevent standard production deploys from removing WeChat miniapp credentials from the runtime `.env` file.

## Scope

- Updated `ops/server/scripts/deploy_app.sh` to write:
  - `WECHAT_MINIAPP_APPID`
  - `WECHAT_MINIAPP_SECRET`
- The values continue to come from `ops/server/.deploy.env`.
- No secret values are logged or committed.

## Business Rules

- Miniapp login depends on WeChat credentials being present in the server runtime environment.
- Future deploys should preserve the miniapp configuration after it has been set once.
- This does not change parent login, staff login, request handling, database schema, or public API contracts.

## Verification

- Release doc gate passed.
- Production `.env` contains the miniapp variable names after deployment.
- `/admin/login` returns `200`.
- Unauthenticated miniapp request endpoints return `Unauthorized`.
