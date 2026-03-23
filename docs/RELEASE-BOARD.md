# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-03-23`
- Health check: `/admin/login` => `200`

## Current Known State

- Local HEAD: upload access recovery + recovery scanner key compatibility patch.
- Server process restarted and upload static paths under `/uploads/*` are reachable again.
- Pending this deploy commit sync, remote should align to current branch HEAD.

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

1. Keep `CHANGELOG-LIVE`, `RELEASE-BOARD`, `TASK-*` updated for each deploy commit.
2. Add post-deploy quick check for a known `/uploads/payment-proofs/*` URL.
3. Keep ops docs aligned with Neon-as-production-db policy.

## 2026-03-23-r1 Planned Sync

- Target: align server to current branch deploy commit.
- Scope: recovery scanner key compatibility + upload access recovery verification.
- Business impact: none on finance approval/business logic.
- Validation:
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - `/uploads/payment-proofs/*` sample URL returns `200`
  - server commit equals deploy commit
