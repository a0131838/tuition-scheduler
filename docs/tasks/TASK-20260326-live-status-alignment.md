# TASK-20260326 Live Status Alignment

## Goal
- Align release documents with the actual server commit and deployment state before the next deploy.

## Scope
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260326-live-status-alignment.md`

## Risk Boundary
- Documentation and deploy-process alignment only.
- No business logic change.
- No database, runtime config, or PM2 process behavior change.

## Validation
1. `bash ops/server/scripts/new_chat_startup_check.sh` shows the real `local/origin/server` commit state.
2. `CHANGELOG-LIVE.md` no longer implies `2026-03-26-r1/r2` are already live when server commit is behind.
3. `RELEASE-BOARD.md` records the current server commit and mismatch status clearly.

## Status
- Completed locally; ready for deploy.
