# TASK-20260322 Startup Check Rollout

## Goal
- Publish the startup verification helper to production process flow.
- Keep business logic unchanged.

## Scope
- `ops/server/scripts/new_chat_startup_check.sh`
- `docs/SERVER-HANDOFF.md`
- `docs/NEW-CHAT-COMMANDS.md`

## Risk Boundary
- Process-only rollout, no feature/runtime behavior changes.
- If release-doc gate blocks deploy, update release docs in same commit and redeploy.

## Validation
1. Script runs locally: `bash ops/server/scripts/new_chat_startup_check.sh`.
2. Script prints local/origin/server commit values and health code.
3. After deploy, server commit equals target commit.

## Status
- In progress: preparing release-doc gate compliant commit.
