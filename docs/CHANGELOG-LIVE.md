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

## 2026-03-22-r6

- Release ID: `2026-03-22-r6`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Fix quick deploy/check script default path resolution.
- Key files:
  - `ops/server/scripts/quick_check.sh`
  - `ops/server/scripts/quick_deploy.sh`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260322-context-control.md`
- Risk impact (if any): Process-only; no runtime business logic change.
- Verification:
  - `bash ops/server/scripts/quick_deploy.sh ...` can find and execute `quick_check.sh`
- Rollback point: `39e9967`.

## 2026-03-22-r7

- Release ID: `2026-03-22-r7`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Release board state alignment after latest successful deploy.
- Key files:
  - `docs/RELEASE-BOARD.md`
  - `docs/CHANGELOG-LIVE.md`
- Risk impact (if any): None (documentation-only alignment).
- Verification:
  - `RELEASE-BOARD` remote commit updated to `d00be8e`
- Rollback point: `d00be8e` (runtime unchanged).

## 2026-03-22-r8

- Release ID: `2026-03-22-r8`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Add one-click new chat startup verification script and entry docs.
- Key files:
  - `ops/server/scripts/new_chat_startup_check.sh`
  - `docs/SERVER-HANDOFF.md`
  - `docs/NEW-CHAT-COMMANDS.md`
  - `docs/tasks/TASK-20260322-startup-check-rollout.md`
- Risk impact (if any): Process-only; no business logic/runtime behavior change.
- Verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - local/origin/server commit alignment is printed
  - `/admin/login` returns `200`
- Rollback point: `e215176`.

## 2026-03-23-r1

- Release ID: `2026-03-23-r1`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Upload access recovery + recovery scanner key compatibility.
- Key files:
  - `app/admin/recovery/uploads/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-upload-access-recovery.md`
- Risk impact (if any): Low. No billing/approval business rule change; recovery page now scans both legacy/new billing keys.
- Verification:
  - restart `pm2` process `tuition-scheduler` on server
  - `https://sgtmanage.com/uploads/payment-proofs/3e124342-fb43-415a-b15e-810f5ff23c68/1774269713216_6b67ed17.jpg` returns `200`
  - sample upload URLs under `/uploads/tickets/*` return `200`
  - `npm run build` passed
- Rollback point: commit before `2026-03-23-r1` deploy (`072686a`).

## 2026-03-23-r2

- Release ID: `2026-03-23-r2`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Ledger integrity detail report clarity upgrade (reason + evidence + action columns in CSV).
- Key files:
  - `scripts/reconciliation/daily-ledger-integrity.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-ledger-report-clarity.md`
- Risk impact (if any): Low; reporting/output schema enhancement only, no deduction business logic changes.
- Verification:
  - `npm run audit:ledger-integrity`
  - generated detail CSV includes columns `reasonCode/rootCauseCN/rootCauseEN/suggestedActionCN/suggestedActionEN`
- Rollback point: previous deploy commit `7ab2e5f`.

## 2026-03-23-r3

- Release ID: `2026-03-23-r3`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Package ledger note readability upgrade for both legacy/manual reconcile notes and abnormal txn notes.
- Key files:
  - `lib/package-ledger-note.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-ledger-note-readable.md`
- Risk impact (if any): Low. Display/wording enhancement only; no minutes delta, posting rule, or deduction logic change.
- Verification:
  - `npm run build` passed
  - ledger page shows readable multi-line notes instead of raw `reason=...;actual=...;expected=...;diff=...` for legacy manual reconcile entries
- Rollback point: previous deploy commit `8a29fc9`.
