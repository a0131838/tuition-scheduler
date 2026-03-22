# HIGH RISK AREAS (生产高风险清单)

## Purpose

Prevent accidental data loss / feature rollback during deploy and ops.

## A) Dangerous-by-default commands

These commands are allowed only with explicit approval and rollback plan:

- `ops/server/scripts/sync_local_db_to_neon.sh`
  - It can overwrite Neon data.
- Any script/command that switches `DATABASE_URL` / `DIRECT_DATABASE_URL`
- Bulk destructive SQL (`DROP`, `TRUNCATE`, mass `DELETE`)
- Deploying a stale branch with `git reset --hard origin/<old-branch>`

## B) Production data source rule

- Production source of truth: Neon PostgreSQL.
- `ops/server/.deploy.env` and runtime `.env` must point to Neon (not localhost).
- If db target is uncertain, stop and run diagnostics first.

## C) Required preflight before deploy

1. Run quick check:
   - `bash ops/server/scripts/quick_check.sh`
2. Confirm target branch and commit.
3. Confirm release docs are updated:
   - `docs/CHANGELOG-LIVE.md`
   - `docs/RELEASE-BOARD.md`
   - `docs/tasks/TASK-*.md`

## D) If incident happened

1. Freeze write operations.
2. Capture current env/db target and PM2 status.
3. Restore correct branch/env first.
4. Then verify data source and records.
