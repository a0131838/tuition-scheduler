# CHANGELOG LIVE

This file is the single source of truth for what changed in production.

## Entry Template

- Release ID:
- Date/Time (Asia/Shanghai):
- Scope:
- Key files:
- Risk impact (if any):
- Verification:
- Rollback point:

---

## 2026-03-22-r1

- Release ID: `2026-03-22-r1`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Time display unification (business timezone format), finance/receipt flow continuity, layout and route stability checks.
- Key files:
  - `lib/date-only.ts`
  - `app/admin/layout.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
- Risk impact (if any): Finance role route/menu is intentionally restricted by role policy; non-finance admin menu differs by design.
- Verification:
  - `npm run build` passed.
  - `https://sgtmanage.com/admin/login` returns `200`.
  - PM2 process `tuition-scheduler` online.
- Rollback point: Remote git commit baseline before patch rollout (`56a91b1`) or previous deployment archive.

## 2026-03-22-r2

- Release ID: `2026-03-22-r2`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Add release doc gate in deploy flow (process-only safeguard).
- Key files:
  - `ops/server/scripts/verify_release_docs.sh`
  - `ops/server/scripts/deploy_app.sh`
  - `.github/workflows/deploy-server.yml`
  - `ops/server/.deploy.env.example`
- Risk impact (if any): Deploy can be blocked if release docs are not updated in the deploy commit.
- Verification:
  - `bash -n ops/server/scripts/verify_release_docs.sh`
  - `bash -n ops/server/scripts/deploy_app.sh`
- Rollback point: Revert r2 process files if emergency rollback is needed.

## 2026-03-22-r3

- Release ID: `2026-03-22-r3`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Add server handoff baseline + one-command server operations for new chat windows.
- Key files:
  - `docs/SERVER-HANDOFF.md`
  - `ops/server/server-handoff.env.example`
  - `ops/server/scripts/quick_check.sh`
  - `ops/server/scripts/quick_deploy.sh`
  - `docs/NEW-CHAT-COMMANDS.md`
  - `docs/CODEX-新对话开场白.txt`
- Risk impact (if any): Process-only change; no runtime/business logic impact.
- Verification:
  - `bash -n ops/server/scripts/quick_check.sh`
  - `bash -n ops/server/scripts/quick_deploy.sh`
  - script files are executable
- Rollback point: Revert r3 process files only.

## 2026-03-22-r4

- Release ID: `2026-03-22-r4`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: High-risk ops hardening (docs + dangerous script confirmation gate).
- Key files:
  - `docs/HIGH-RISK-AREAS.md`
  - `docs/运维手册.md`
  - `docs/GitHub-Actions部署说明.md`
  - `docs/CODEX-生产发布指挥模板.md`
  - `docs/自有服务器部署指南.md`
  - `docs/SERVER-HANDOFF.md`
  - `ops/server/scripts/sync_local_db_to_neon.sh`
- Risk impact (if any): Process/script guard only; no business logic change.
- Verification:
  - `bash -n ops/server/scripts/sync_local_db_to_neon.sh`
  - docs now explicitly warn against localhost DB and stale-branch deploy risks.
- Rollback point: Revert r4 doc/script guard files.

## 2026-03-22-r5

- Release ID: `2026-03-22-r5`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Build hotfix to restore missing date helper exports required by finance pages.
- Key files:
  - `lib/date-only.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260322-context-control.md`
- Risk impact (if any): Low; utility exports only, no business rule change.
- Verification:
  - remote build passes after export fix
  - `/admin/login` health check returns `200`
- Rollback point: Previous commit `7598093`.
