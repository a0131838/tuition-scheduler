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

## 2026-03-23-r4

- Release ID: `2026-03-23-r4`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Add user-facing helper hint in package ledger edit area to explain readable note behavior after save.
- Key files:
  - `app/admin/packages/[id]/ledger/PackageLedgerEditTxnClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-ledger-note-readable.md`
- Risk impact (if any): Very low. UI helper text only; no API/data/ledger arithmetic change.
- Verification:
  - `npm run build` passed
  - edit area shows hint: "保存后将自动按可读模板展示备注（历史技术备注也会自动转为易读说明）"
- Rollback point: previous deploy commit `be377a2`.

## 2026-03-26-r1

- Release ID: `2026-03-26-r1`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Deployment status: `LIVE` (included in the currently deployed production branch lineage)
- Scope: Align group package selection across enrollment preview, enrollment submit, attendance package ordering, and student package balance preview; prefer `GROUP_MINUTES` and keep `GROUP_COUNT` fallback for legacy group classes.
- Key files:
  - `lib/package-mode.ts`
  - `app/api/admin/classes/[id]/enrollment-preview/route.ts`
  - `app/api/admin/enrollments/route.ts`
  - `app/api/admin/students/[id]/package-balance-preview/route.ts`
  - `app/admin/sessions/[id]/attendance/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260326-group-package-alignment.md`
- Risk impact (if any): Medium-low. Affects group-class package matching/preview behavior only; 1-on-1 package logic remains unchanged. Main risk is inconsistent legacy `GROUP_COUNT` expectations if downstream pages assume minute-based checks.
- Verification:
  - `npm run build` passed
  - group-class enrollment preview and submit use the same preferred package rule
  - attendance page package ordering prefers `GROUP_MINUTES`, then falls back to legacy `GROUP_COUNT`
  - package balance preview no longer treats legacy `GROUP_COUNT` as minute-based duration check
- Rollback point: previous commit before alignment patch (`6536928` baseline before next deploy commit).

## 2026-03-26-r3

- Release ID: `2026-03-26-r3`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Scope: Backend integrity hardening for scheduling, package top-up, expense claim state transitions, and teacher availability cleanup/guard rails.
- Key files:
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/teachers/[id]/generate-sessions/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/teachers/[id]/availability/date/route.ts`
  - `app/api/admin/teachers/[id]/availability/weekly/route.ts`
  - `app/api/teacher/availability/slots/route.ts`
  - `app/api/teacher/availability/bulk/route.ts`
  - `app/api/teacher/availability/undo/route.ts`
  - `lib/expense-claims.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260326183000_add_session_unique_schedule_guard/migration.sql`
  - `prisma/migrations/20260326195000_add_availability_unique_guards/migration.sql`
  - `scripts/report-availability-integrity.ts`
  - `scripts/clean-availability-integrity.ts`
  - `docs/tasks/TASK-20260326-backend-integrity-hardening.md`
- Risk impact (if any): Medium. Duplicate writes are now blocked at DB/app layers, availability creation now rejects overlaps, and historical availability data was normalized by merging overlapping ranges. Normal scheduling rules are unchanged, but repeated submits now fail fast instead of silently duplicating.
- Verification:
  - `npm run test:backend` passed (`16/16`)
  - `npm run build` passed
  - `npm run audit:availability-integrity` reports zero duplicate/overlap groups
  - `npx prisma migrate deploy` applied `20260326183000_add_session_unique_schedule_guard` and `20260326195000_add_availability_unique_guards`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirms local/origin/server align on the live branch head
  - release-doc closeout follow-up was completed on the same live branch lineage
- Rollback point: previous production commit before backend-integrity deploy (`98f1b9d` lineage baseline).

## 2026-03-26-r2

- Release ID: `2026-03-26-r2`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Deployment status: `LIVE` (included in the currently deployed production branch lineage)
- Scope: Fix todo-center deduction status so waived assessment attendance is not shown as pending deduction.
- Key files:
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260326-waived-attendance-todo-fix.md`
- Risk impact (if any): Low. Todo/dashboard display logic only; no attendance write path or package ledger arithmetic change.
- Verification:
  - `npm run build` passed
  - attendance rows with `waiveDeduction=true` are excluded from todo pending-deduction count
  - waived assessment lessons show "无需减扣" instead of "待减扣"
- Rollback point: previous commit before todo waived-deduction fix (`dcac9fe`).

## 2026-03-26-doc-status

- Release ID: `2026-03-26-doc-status`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Deployment status: `LIVE`
- Scope: Align release documents with the actual server commit and current deploy state after startup-check verification.
- Key files:
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260326-live-status-alignment.md`
- Risk impact (if any): None. Documentation/process alignment only; no business logic or runtime behavior change.
- Verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - local/origin/server are aligned
  - `2026-03-26-r1/r2` are now marked live after deploy completion
- Rollback point: previous docs-only release alignment commit.
