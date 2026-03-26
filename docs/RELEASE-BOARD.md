# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-03-26`
- Health check: `/admin/login` => `200`
- Server commit: `e96ce99`
- Local commit: `e96ce99`
- Origin commit: `e96ce99`
- Alignment status: `ALIGNED`

## Current Known State

- Local HEAD: strict superadmin availability bypass branch head (`e96ce99`).
- Previous server fix remains in place: upload static paths under `/uploads/*` are reachable.
- `bash ops/server/scripts/new_chat_startup_check.sh` confirmed local/origin/server commit `e96ce99` are aligned and `/admin/login` => `200`.
- `2026-03-26-r1` and `2026-03-26-r2` are now live on the current server commit lineage.
- Release-doc gate requires `CHANGELOG-LIVE`, `RELEASE-BOARD`, and a matching `TASK-*` file in the same deploy commit.

## Open Risks

- Working tree hygiene risk: local repo currently contains unrelated untracked files and generated artifacts; avoid mixing them into deploy commits.
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

## 2026-03-26-r1 Deployed

- Deployed: group package alignment is live on the current production branch lineage.
- Scope: use one shared preferred-package rule for group enrollment preview, actual enrollment, attendance default ordering, and balance preview.
- Business impact: group classes prefer `GROUP_MINUTES`; legacy `GROUP_COUNT` remains fallback. 1-on-1 logic unchanged.
- Validation:
  - `npm run build`
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - group enrollment preview result matches enrollment submit result
  - legacy `GROUP_COUNT` preview is not blocked by minute-duration comparison

## 2026-03-26-r2 Deployed

- Deployed: waived-attendance todo fix is live on the current production branch lineage.
- Scope: todo deduction summary respects `waiveDeduction` and does not flag assessment lessons as pending deduction.
- Business impact: dashboard/todo card messaging only. Attendance save and package deduction behavior unchanged.
- Validation:
  - `npm run build`
  - waived attendance sessions show `No deduction required / 无需减扣` in todo center
  - `bash ops/server/scripts/new_chat_startup_check.sh`

## 2026-03-26-doc-status Deployed

- Deployed: release document alignment patch is live at server commit `e96ce99`.
- Scope: close out startup-check mismatch findings and keep release docs consistent with the actual deployed branch state.
- Business impact: none. Documentation/process alignment only.
