# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-03-22`
- Health check: `/admin/login` => `200`

## Current Known State

- Local HEAD: `79a2e18` (in-progress hotfix chain)
- Remote HEAD: `79a2e18` (branch updated, deployment pending gate-compliant doc commit)
- Note: Remote workspace has uncommitted changes. Treat as high-risk until normalized.

## Open Risks

- Deployment reproducibility risk: local/remote commit mismatch.
- Human memory risk: changes were spread across multiple sessions.
- Finance menu perception risk: role-based sidebar can look like "missing features" for FINANCE users.
- New process risk: deploy will fail if release docs are not included in the deploy commit.
- Historical risk confirmed: server env previously pointed to localhost DB in older backups.

## Process Guard (Installed)

1. `deploy_app.sh` now calls `verify_release_docs.sh` by default.
2. GitHub Actions deploy workflow now runs the same gate before SSH deploy.
3. Emergency bypass exists: `SKIP_RELEASE_DOC_CHECK=true` (use only for urgent hotfix).

## Server Handoff Guard (Installed)

1. Added fixed server profile doc: `docs/SERVER-HANDOFF.md`
2. Added local config template: `ops/server/server-handoff.env.example`
3. Added one-command scripts:
   - `bash ops/server/scripts/quick_check.sh`
   - `bash ops/server/scripts/quick_deploy.sh`

## Next Mandatory Step (No Business Logic Change)

1. Freeze a clean release commit from current effective code.
2. Keep `CHANGELOG-LIVE`, `RELEASE-BOARD`, `TASK-*` updated for each deploy commit.
3. Keep ops docs aligned with Neon-as-production-db policy.
