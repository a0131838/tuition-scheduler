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

## 2026-03-31-r3

- Release ID: `2026-03-31-r3`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Scope: Extend teacher session visibility window and normalize availability date handling to business timezone across teacher/admin views.
- Key files:
  - `app/teacher/sessions/page.tsx`
  - `app/teacher/availability/page.tsx`
  - `app/api/teacher/availability/_lib.ts`
  - `app/api/teacher/availability/slots/route.ts`
  - `app/api/teacher/availability/clear-day/route.ts`
  - `app/api/admin/teachers/[id]/availability/route.ts`
  - `app/api/admin/teachers/[id]/availability/date/route.ts`
  - `app/api/admin/teachers/[id]/availability/generate-month/route.ts`
  - `app/admin/teachers/[id]/calendar/page.tsx`
- Risk impact (if any): Low-to-medium. Changes how date-only availability rows are queried/rendered, but does not change scheduling rules or slot durations.
- Verification:
  - `npm run build` passed.
  - production probe confirmed Yunfeng still has `46` April sessions and `57` April date-availability rows; the issue was display logic, not missing data.
- Rollback point: Previous production commit before `2026-03-31-r3`.

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

## 2026-03-27-r1

- Release ID: `2026-03-27-r1`
- Date/Time (Asia/Shanghai): `2026-03-27`
- Deployment status: `LIVE` (included in the currently deployed production branch lineage)
- Scope: Add optimistic-lock retry protection for `partner/parent billing` JSON stores and related approval flows, plus regression coverage for concurrent-write preservation.
- Key files:
  - `lib/app-setting-lock.ts`
  - `lib/partner-billing.ts`
  - `lib/student-parent-billing.ts`
  - `lib/partner-settlement-approval.ts`
  - `lib/partner-receipt-approval.ts`
  - `lib/parent-receipt-approval.ts`
  - `tests/app-setting-lock.test.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/tasks/TASK-20260327-billing-optimistic-lock.md`
- Risk impact (if any): Medium. Existing data model and UI flow stay unchanged, but concurrent billing/approval writes now retry against latest `AppSetting.updatedAt` and may fail explicitly instead of silently overwriting another operator's changes.
- Verification:
  - `npm run test:backend` passed (`22/22`)
  - `npm run build` passed
  - parent invoice creation test preserves a concurrent invoice after retry
  - partner settlement reject test replays correctly after optimistic-lock conflict
- Rollback point: previous production commit before `2026-03-27-r1` deploy (`c3800f0`).

## 2026-03-29-r1

- Release ID: `2026-03-29-r1`
- Date/Time (Asia/Shanghai): `2026-03-29`
- Deployment status: `LIVE`
- Scope: Fix receipt/settlement approval state loading after the `AppSetting` optimistic-lock rollout so existing JSON approval rows are read correctly instead of being treated as empty.
- Key files:
  - `lib/parent-receipt-approval.ts`
  - `lib/partner-receipt-approval.ts`
  - `lib/partner-settlement-approval.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260329-receipt-approval-json-read-fix.md`
- Risk impact (if any): Medium. No approval rules or routes changed, but approval JSON rows now hydrate from stored arrays correctly, which restores manager/finance status visibility and prevents approval flows from acting like prior approvals are missing.
- Verification:
  - `npm run test:backend` passed (`23/23`)
  - `npm run build` passed
  - parent receipt approval map regression test confirms stored JSON approvals are read back with normalized approver emails
- Rollback point: previous production commit before `2026-03-29-r1` hotfix (`2ce03bd`).

## 2026-03-29-r2

- Release ID: `2026-03-29-r2`
- Date/Time (Asia/Shanghai): `2026-03-29`
- Deployment status: `LIVE`
- Scope: Add a guardrail around the `AppSetting` optimistic-lock helper so callers treat `sanitize` input as already-parsed JSON, plus regression coverage for that contract.
- Key files:
  - `lib/app-setting-lock.ts`
  - `tests/app-setting-lock.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260329-app-setting-sanitize-guard.md`
- Risk impact (if any): Low. Runtime business logic is unchanged; this only documents the helper contract and adds a test to catch future regressions in JSON-store callers.
- Verification:
  - `npm run test:backend` passed (`24/24`)
- Rollback point: previous production commit before `2026-03-29-r2` (`06c6fc7`).

## 2026-03-30-r1

- Release ID: `2026-03-30-r1`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE`
- Scope: Prevent duplicate expense-claim submissions from repeated taps and clean up the duplicated Ahmar transport claims created on `2026-03-30`.
- Key files:
  - `lib/expense-claims.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/_components/ExpenseClaimForm.tsx`
  - `app/_components/ExpenseClaimSubmitButton.tsx`
  - `tests/expense-claims.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-claim-duplicate-guard.md`
- Risk impact (if any): Medium. Normal expense submission flow is unchanged, but exact duplicate claims within a short window now resolve to "already submitted" instead of writing more rows.
- Verification:
  - `npm run test:backend` passed (`25/25`)
  - `npm run build` passed
  - Ahmar duplicate `2026-03-29` transport claims were reduced to a single retained submission
- Rollback point: previous production commit before `2026-03-30-r1` (`157ea31`).

## 2026-03-30-r2

- Release ID: `2026-03-30-r2`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE`
- Scope: Route admin parent payment proof open/preview through a controlled record-id endpoint in receipt approvals.
- Key files:
  - `app/api/admin/parent-payment-records/[id]/file/route.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-parent-payment-proof-route.md`
- Risk impact (if any): Low. No parent billing storage, upload, receipt creation, or approval rules changed; only the admin file open/preview path for parent payment proof records now resolves via a controlled route.
- Verification:
  - `npm run build` passed
  - admin receipt approvals now opens parent payment proof files via `/api/admin/parent-payment-records/[id]/file`
  - existing valid payment-proof files remain reachable through the controlled route
- Rollback point: previous production commit before `2026-03-30-r2`.

## 2026-03-30-r3

- Release ID: `2026-03-30-r3`
- Date/Time (Asia/Shanghai): `2026-03-30 15:44 CST`
- Deployment status: `LIVE` after deploy completion
- Scope: Allow teachers to correct rejected expense claims and resubmit the same claim back into the approval queue.
- Key files:
  - `lib/expense-claims.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `tests/expense-claims.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-claim-resubmit.md`
- Risk impact (if any): Low-to-medium. Only rejected claims gain a resubmit path; approval, payment, and archive rules stay unchanged. Teachers can now reopen a rejected claim by correcting fields and optionally replacing the attachment.
- Verification:
  - `npm run test:backend` passed (`27/27`)
  - `npm run build` passed
  - rejected claims return to `SUBMITTED` after resubmit
  - non-rejected claims are blocked from using the resubmit path
- Rollback point: previous production commit before `2026-03-30-r3`.
- Release closeout: production branch/doc alignment confirmed on follow-up docs commit `f28a145`.

## 2026-03-30-r4

- Release ID: `2026-03-30-r4`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Improve teacher expense-claim receipt/status UX with bilingual human-readable labels and explicit attachment-health feedback.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-claim-ux-copy.md`
- Risk impact (if any): Low. Teacher-facing wording and attachment-health indicators only; approval, payment, and archive logic are unchanged.
- Verification:
  - `npm run build` passed
  - expense-claim statuses render as bilingual human-readable labels
  - missing attachments show explicit bilingual warning text
  - rejected claims show a clearer bilingual next-step card for resubmission
- Rollback point: previous production commit before `2026-03-30-r4`.

## 2026-03-30-r5

- Release ID: `2026-03-30-r5`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce clutter on the admin receipt approval page with clearer queue wording, stronger focus on the selected receipt, and secondary tools moved into `More actions / 更多操作`.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-ux-polish.md`
- Risk impact (if any): Low. Review/approval business rules, permissions, and finance workflows are unchanged; this release only changes interaction emphasis and bilingual copy on the receipt approval page.
- Verification:
  - `npm run build` passed
  - queue rows show bilingual human-readable status labels
  - selected receipt panel highlights the current item and main review action
  - fix/revoke/package-billing links moved under `More actions / 更多操作`
- Rollback point: previous production commit before `2026-03-30-r5`.

## 2026-03-30-r6

- Release ID: `2026-03-30-r6`
- Date/Time (Asia/Shanghai): `2026-03-30 16:23 CST`
- Deployment status: `LIVE` after deploy completion
- Scope: Smooth receipt approval handling with next-item auto-advance, standardized bilingual reject reasons, and a lightweight timeline for the selected receipt.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-flow-smoothing.md`
- Risk impact (if any): Low. Approval sequencing, permission rules, and receipt/billing data flow remain unchanged; this release only improves interaction flow and bilingual guidance on the receipt approval page.
- Verification:
  - `npm run build` passed
  - approve/reject actions carry forward to the next queue item
  - reject actions use standardized bilingual reasons plus optional detail
  - selected receipt panel shows a lightweight bilingual timeline
- Rollback point: previous production commit before `2026-03-30-r6`.

## 2026-03-30-r7

- Release ID: `2026-03-30-r7`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the receipt approval queue feel more like a worklist with task-first ordering, clearer success feedback, and action-oriented risk guidance.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-worklist-polish.md`
- Risk impact (if any): Low. This release only adjusts queue ordering and bilingual review-page messaging; approval sequence, permissions, and billing data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - pending risky items sort ahead of completed items in the review queue
  - success banner explains the action result and next-item jump in bilingual wording
  - risk box includes explicit bilingual recommended next steps
- Rollback point: previous production commit before `2026-03-30-r7`.

## 2026-03-30-r8

- Release ID: `2026-03-30-r8`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Further reduce receipt approval cognitive load by de-emphasizing completed rows, adding queue risk badges, and clarifying current role focus.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-role-focus-polish.md`
- Risk impact (if any): Low. This release only adjusts review-page presentation and queue labeling; approval order, permissions, and billing data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - completed rows render with lower visual priority in the queue
  - queue rows show bilingual risk badges such as missing proof / file missing / ready
  - selected receipt panel shows current role focus in bilingual wording
- Rollback point: previous production commit before `2026-03-30-r8`.

## 2026-03-30-r9

- Release ID: `2026-03-30-r9`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Reshape the receipt approval queue into clearer work buckets: my next actions, other open items, and completed history.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-bucketed-queue.md`
- Risk impact (if any): Low. This release only changes review-page grouping and emphasis; approval order, permissions, and finance data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - queue renders separate bilingual sections for my next actions, other open items, and completed history
  - completed items no longer visually compete with open work
  - selected receipt behavior and review actions remain unchanged
- Rollback point: previous production commit before `2026-03-30-r9`.

## 2026-03-30-r10

- Release ID: `2026-03-30-r10`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Add queue bucket summaries, one-click focus filters, and a collapsed completed-history section on the receipt approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-focus-filters.md`
- Risk impact (if any): Low. This release only changes queue focus controls and history visibility; approval order, permissions, and finance data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - queue header shows bilingual counts for my actions, other open items, and completed history
  - operators can switch to focused views such as only my actions or only completed history
  - completed history is collapsed by default unless the history-only view is selected
- Rollback point: previous production commit before `2026-03-30-r10`.

## 2026-03-30-r11

- Release ID: `2026-03-30-r11`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Add queue-level fix shortcuts for risky parent receipts and tighten queue priority so missing proof/file issues rise above generic review work.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-fix-shortcuts.md`
- Risk impact (if any): Low. This release only changes queue shortcuts and ordering emphasis; approval order, permissions, and finance data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - parent rows with rejected/missing-proof/file-missing states show a bilingual fix shortcut in the queue
  - missing proof and missing file issues sort ahead of generic review items
  - selected receipt actions and approval rules remain unchanged
- Rollback point: previous production commit before `2026-03-30-r11`.

## 2026-03-30-r12

- Release ID: `2026-03-30-r12`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Align receipt approval queue and detail-panel risk signals, remove duplicated bilingual copy, and keep `Only my actions` from auto-selecting unrelated open work when the bucket is empty.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-qa-followups.md`
- Risk impact (if any): Low. This release only fixes approval-page guidance and selection behavior; approval rules, permissions, and finance data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - selected receipt risk panel now matches queue-level file-missing and missing-proof signals
  - duplicated bilingual labels no longer render twice in the queue and detail panel
  - `Only my actions / 只看我待处理的` no longer defaults to another bucket when there are no mine items
- Rollback point: previous production commit before `2026-03-30-r12`.

## 2026-03-30-r13

- Release ID: `2026-03-30-r13`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Remove the remaining duplicated bilingual labels in the selected receipt detail and action area on the receipt approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-copy-cleanup.md`
- Risk impact (if any): Low. This release only cleans up operator-facing bilingual copy in the selected receipt panel; approval rules, permissions, and finance data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - timeline, manager/finance action headers, receipt file card, and more-actions labels render once in bilingual mode
  - revoke input/button labels no longer duplicate the same bilingual copy twice
- Rollback point: previous production commit before `2026-03-30-r13`.

## 2026-03-30-r14

- Release ID: `2026-03-30-r14`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Add clearer batch-style review actions, stronger risk tiers, and a fix-flow return cue on the receipt approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-batch-flow-and-risk-tiers.md`
- Risk impact (if any): Low. This release only refines operator guidance and action wording on the approval page; approval rules, permissions, and finance data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - primary review buttons now read `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条` when another queue item is available
  - queue rows now distinguish `Blocker / 阻塞`, `Needs check / 需要核对`, and `Ready / 可处理`
  - finance fix flows show a bilingual return cue back to the selected receipt review item
- Rollback point: previous production commit before `2026-03-30-r14`.

## 2026-03-30-r15

- Release ID: `2026-03-30-r15`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Hotfix the teacher expense-claim submit button so browser-side validation no longer leaves the UI stuck on `Submitting...`.
- Key files:
  - `app/_components/ExpenseClaimSubmitButton.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-submit-validation-hotfix.md`
- Risk impact (if any): Low. This release only changes client-side pending behavior for expense-claim submission buttons; expense validation rules, submit flow, and duplicate protection remain unchanged.
- Verification:
  - `npm run build` passed
  - expense-claim submit button only switches to `Submitting... / 提交中...` after browser validity checks pass
  - missing required fields or files no longer leave the button stuck in a disabled pending state
- Rollback point: previous production commit before `2026-03-30-r15`.

## 2026-03-30-r16

- Release ID: `2026-03-30-r16`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify teacher expense-claim form requirements with bilingual pre-submit guidance and field-level hints.
- Key files:
  - `app/_components/ExpenseClaimForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-form-guidance.md`
- Risk impact (if any): Low. This release only improves form copy and hint text; expense validation rules, submit flow, and approval logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher expense form now shows a bilingual `Before you submit / 提交前请检查` checklist
  - transport, attachment, and purpose fields now include clearer bilingual helper text
- Rollback point: previous production commit before `2026-03-30-r16`.

## 2026-03-30-r17

- Release ID: `2026-03-30-r17`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Move expense-claim submit and resubmit flows off volatile Next Server Actions onto stable multipart POST routes for teacher and admin entry points.
- Key files:
  - `app/api/teacher/expense-claims/route.ts`
  - `app/api/teacher/expense-claims/resubmit/route.ts`
  - `app/api/admin/expense-claims/route.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/_components/ExpenseClaimForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-submit-route-stability.md`
- Risk impact (if any): Medium-low. This release keeps the same validation, duplicate guard, and approval behavior, but switches submit transport for teacher/admin expense forms to stable route handlers so already-open pages are less likely to fail across deploys.
- Verification:
  - `npm run build` passed
  - teacher new submit now posts to `/api/teacher/expense-claims`
  - teacher rejected-claim resubmit now posts to `/api/teacher/expense-claims/resubmit`
  - admin self-submit now posts to `/api/admin/expense-claims`
- Rollback point: previous production commit before `2026-03-30-r17`.

## 2026-03-31-r01

- Release ID: `2026-03-31-r01`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Fix teacher/admin expense submit buttons so mobile browsers do not get stuck on `Submitting...` before the browser sends the real multipart POST.
- Key files:
  - `app/_components/ExpenseClaimSubmitButton.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-expense-submit-button-timing.md`
- Risk impact (if any): Low. This release only delays the pending-state UI flip by one tick so native form submission can start first; expense validation, duplicate-submit handling, and approval/payment logic stay unchanged.
- Verification:
  - `npm run build` passed
  - reproduced locally that disabling a submit button inside its click handler can prevent the browser from sending the form request
  - expense submit button now enters `Submitting... / 提交中...` after the browser has a chance to dispatch the native submit
- Rollback point: previous production commit before `2026-03-31-r01`.

## 2026-03-31-r02

- Release ID: `2026-03-31-r02`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Let teachers withdraw their own submitted expense claims before review instead of needing hard delete.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260331095000_add_expense_claim_withdrawn_status/migration.sql`
  - `lib/expense-claims.ts`
  - `app/api/teacher/expense-claims/withdraw/route.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-expense-claim-withdraw.md`
- Risk impact (if any): Medium-low. This adds a new `WITHDRAWN` status and a teacher-only withdraw path for `SUBMITTED` claims; approval, rejection, payment, and archive logic for all existing statuses stay unchanged.
- Verification:
  - `npm run build` passed
  - teachers now see `Withdraw claim / 撤回报销单` on their own submitted claims
  - only `SUBMITTED` claims can be withdrawn
- Rollback point: previous production commit before `2026-03-31-r02`.

## 2026-03-31-r03

- Release ID: `2026-03-31-r03`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Hide withdrawn expense claims from the default teacher list while keeping them available through the status filter.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-expense-claim-default-hide-withdrawn.md`
- Risk impact (if any): Low. This release only changes the default teacher list view for expense claims; withdraw, submit, approval, payment, and archive behavior stay unchanged.
- Verification:
  - `npm run build` passed
  - `All active claims / 全部有效报销单` now excludes `WITHDRAWN` by default
  - teachers can still review withdrawn claims by explicitly selecting `WITHDRAWN`
- Rollback point: previous production commit before `2026-03-31-r03`.

## 2026-03-31-r04

- Release ID: `2026-03-31-r04`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Add uploads backup/audit/disk-monitoring ops toolkit for safer file retention and earlier storage alerts.
- Key files:
  - `scripts/audit-upload-integrity.ts`
  - `ops/server/scripts/run_upload_integrity_with_alert.sh`
  - `ops/server/scripts/setup_upload_integrity_cron.sh`
  - `ops/server/scripts/check-disk-usage.sh`
  - `ops/server/scripts/setup_disk_usage_cron.sh`
  - `ops/server/scripts/report-large-dirs.sh`
  - `ops/server/scripts/backup_uploads_to_object_storage.sh`
  - `ops/server/scripts/setup_uploads_backup_cron.sh`
  - `package.json`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-upload-ops-toolkit.md`
- Risk impact (if any): Low. This release adds server-side audit/backup/monitoring tooling only; no upload business logic, approval flow, or file path format changed.
- Verification:
  - `npm run audit:upload-integrity` passed and wrote reports under `ops/reports/`
  - `bash ops/server/scripts/check-disk-usage.sh` passed
  - `bash ops/server/scripts/report-large-dirs.sh` passed
  - `npm run build` passed
- Rollback point: previous production commit before `2026-03-31-r04`.

## 2026-03-31-r05

- Release ID: `2026-03-31-r05`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Hotfix object-storage upload path for ops backup archives by avoiding multipart upload on the current S3-compatible endpoint.
- Key files:
  - `ops/server/scripts/upload_object_storage_s3.sh`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-upload-object-storage-hotfix.md`
- Risk impact (if any): Low. This release only changes the ops backup upload method for archive files; runtime upload flows, file paths, and business features stay unchanged.
- Verification:
  - `bash -n ops/server/scripts/upload_object_storage_s3.sh` passed
  - upload backup archive can be written to the configured object-storage bucket without the previous multipart `MissingContentLength` error
- Rollback point: previous production commit before `2026-03-31-r05`.

## 2026-03-31-r06

- Release ID: `2026-03-31-r06`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Fix admin student list counters so the `Full List / 完整列表` card shows the true total student count instead of the current filtered view count.
- Key files:
  - `app/admin/students/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-student-full-list-count-fix.md`
- Risk impact (if any): Low. This only corrects display counters and pagination math labels on the admin students page; no student data, filters, or mutation behavior changed.
- Verification:
  - `npm run build` passed
  - production total student count verified as `73`
  - `Full List / 完整列表` now uses the real total instead of the active view count
- Rollback point: previous production commit before `2026-03-31-r06`.

## 2026-03-31-r07

- Release ID: `2026-03-31-r07`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Reorganize the partner settlement page so daily work focuses on pending actions first, while billing history and settlement setup are moved into lower-priority collapsed sections.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-ux-reorder.md`
- Risk impact (if any): Low. This only changes layout, section ordering, and action-oriented bilingual copy on the partner settlement page; settlement logic, permissions, rates, and billing actions stay unchanged.
- Verification:
  - `npm run build` passed
  - pending work queue now appears before history and setup sections
  - rate settings and package mode config are collapsed into `Settlement setup / 结算配置`
- Rollback point: previous production commit before `2026-03-31-r07`.

## 2026-03-31-r08

- Release ID: `2026-03-31-r08`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a selected-item focus panel, integrity workbench entry points, and billing-history filters to the partner settlement page.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-focus-panel.md`
- Risk impact (if any): Low. This only changes page navigation, focus helpers, and history filtering on the partner settlement page; settlement calculations, invoice creation, permissions, and data mutations remain unchanged.
- Verification:
  - `npm run build` passed
  - partner settlement page shows a sticky `Selected item / 当前处理项` card
  - queue tables provide `Focus / 聚焦` actions
  - billing history supports `All history / 全部历史`, `Invoice only / 仅已开票`, and `Receipt created / 仅已开收据`
- Rollback point: previous production commit before `2026-03-31-r08`.

## 2026-03-31-r09

- Release ID: `2026-03-31-r09`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the partner settlement focus panel more action-oriented and add warning-type summary cards inside the integrity workbench.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-action-focus.md`
- Risk impact (if any): Low. This only adjusts UI copy and warning summaries on the partner settlement page; no settlement rules, calculations, permissions, or actions changed.
- Verification:
  - `npm run build` passed
  - selected-item primary actions now read like direct next steps
  - integrity workbench shows grouped counts for missing-feedback and status-excluded warning rows
- Rollback point: previous production commit before `2026-03-31-r09`.

## 2026-03-31-r10

- Release ID: `2026-03-31-r10`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the partner settlement focus panel actionable and add direct warning-type review shortcuts in the integrity workbench.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-direct-actions.md`
- Risk impact (if any): Low. This only changes partner settlement page interaction flow and shortcut links; settlement calculations, permissions, settlement creation rules, invoice behavior, and revert behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - selected-item panel can directly submit online/offline settlement creation when the user is allowed to act
  - integrity workbench summary cards can jump straight to the first matching warning row
- Rollback point: previous production commit before `2026-03-31-r10`.

## 2026-03-31-r11

- Release ID: `2026-03-31-r11`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Make `Open history / 打开历史` on the partner settlement overview actually expand the billing history section.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-history-open.md`
- Risk impact (if any): Low. This only adjusts a history-panel open state on the partner settlement page; settlement logic, queues, permissions, and calculations remain unchanged.
- Verification:
  - `npm run build` passed
  - clicking `Open history / 打开历史` now lands on an expanded billing-history section
- Rollback point: previous production commit before `2026-03-31-r11`.

## 2026-03-31-r12

- Release ID: `2026-03-31-r12`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Fix the partner settlement integrity-workbench Todo Center shortcut so it points to the real admin todo route.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-todo-link-fix.md`
- Risk impact (if any): Low. This only fixes a broken navigation link from the integrity workbench; settlement logic, warnings, billing flows, and permissions remain unchanged.
- Verification:
  - `npm run build` passed
  - `Open todo center / 打开待办中心` now targets `/admin/todos`
- Rollback point: previous production commit before `2026-03-31-r12`.

## 2026-04-01-r01

- Release ID: `2026-04-01-r01`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Rework the admin expense-claim approval page into a focused review queue with a selected-claim panel and next-step review actions.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-review-flow.md`
- Risk impact (if any): Low. This changes review-page layout and action wording on the admin expense-claim page only; approval, rejection, payment, archive, and export rules remain unchanged.
- Verification:
  - `npm run build` passed
  - submitted claims now appear in a dedicated review queue
  - the selected-claim panel supports `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条`
  - the full claim list remains available in a collapsed history/details section
- Rollback point: previous production commit before `2026-04-01-r01`.

## 2026-04-01-r02

- Release ID: `2026-04-01-r02`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce admin expense-claim review-page noise by demoting reminders and self-submit tools, and stop the collapsed history list from preloading missing receipt thumbnails.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-review-noise-reduction.md`
- Risk impact (if any): Low. This only changes admin expense-claim page presentation and image-loading behavior in the collapsed history list; approval, rejection, payment, and archive logic remain unchanged.
- Verification:
  - `npm run build` passed
  - follow-up reminders now appear in a collapsed summary block below the main review queue
  - the self-submit form moved to a lower-priority collapsed section
  - the collapsed history list no longer preloads receipt thumbnails that could spam 404 console errors
- Rollback point: previous production commit before `2026-04-01-r02`.

## 2026-04-01-r03

- Release ID: `2026-04-01-r03`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a finance-focused payout queue and selected-payout workflow to the admin expense-claim page.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-finance-flow.md`
- Risk impact (if any): Low. This only reorganizes the admin expense-claim payment workflow and button flow for finance users; approval, rejection, payment persistence, archive behavior, and export rules remain unchanged.
- Verification:
  - `npm run build` passed
  - approved unpaid claims now appear in a dedicated finance queue
  - the selected payout panel keeps payment method, payment reference, batch month, and remarks together
  - finance users can use `Mark paid & next / 标记已付款并下一条` to move through the queue
- Rollback point: previous production commit before `2026-04-01-r03`.

## 2026-04-01-r04

- Release ID: `2026-04-01-r04`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a grouped batch-payout flow for finance on the admin expense-claim page.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-finance-batch-payout.md`
- Risk impact (if any): Low. This changes finance-side page workflow only; the system still records payment claim-by-claim using the existing payment logic, audit trail, and archive rules.
- Verification:
  - `npm run build` passed
  - approved unpaid claims now group by submitter and currency
  - finance can select multiple claims in one group and submit shared payment details once
  - the page still preserves the existing single-claim payment behavior in the full history section
- Rollback point: previous production commit before `2026-04-01-r04`.

## 2026-04-01-r05

- Release ID: `2026-04-01-r05`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify quick filters versus advanced filters on the admin expense-claim page.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-filter-clarity.md`
- Risk impact (if any): Low. This only changes filter presentation and explanatory copy on the admin expense-claim page; claim review, finance batch payout, export behavior, and archive rules remain unchanged.
- Verification:
  - `npm run build` passed
  - quick work filters now sit above the main queues and clearly state they affect the queues, history list, and CSV export together
  - advanced filters now live in a dedicated details block with matching explanatory copy
- Rollback point: previous production commit before `2026-04-01-r05`.

## 2026-04-01-r06

- Release ID: `2026-04-01-r06`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the receipt-approval finance queue easier to use on normal-width screens by converting the unified queue from a wide table into a compact worklist.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-receipt-approval-finance-queue-narrowing.md`
- Risk impact (if any): Low. This changes receipt-approval queue presentation only; finance approval, manager approval, reject reasons, redo flow, and receipt creation rules remain unchanged.
- Verification:
  - `npm run build` passed
  - unified receipt queue now renders as compact cards instead of a 9-column table
  - the queue keeps only receipt number, party, amount, status, and risk at list level
  - normal-width screens no longer require horizontal scrolling to understand the finance queue
- Rollback point: previous production commit before `2026-04-01-r06`.

## 2026-04-01-r07

- Release ID: `2026-04-01-r07`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify package-level finance mode versus the global receipt queue on the receipt-approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-receipt-approval-package-mode-clarity.md`
- Risk impact (if any): Low. This only changes page context and presentation while working inside one package; receipt approval, reject, redo, receipt creation, and payment-record rules remain unchanged.
- Verification:
  - `npm run build` passed
  - selecting a package now shows a dedicated package-workspace context card with clear back-to-queue actions
  - the package finance workspace stays open by default once a package is selected
  - the global receipt queue is still available but is visually downgraded to a secondary section while package mode is active
- Rollback point: previous production commit before `2026-04-01-r07`.

## 2026-04-01-r08

- Release ID: `2026-04-01-r08`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Rework the admin sign-in alert page into a session-card workbench so teaching staff can scan the warning board without misreading mixed rows.
- Key files:
  - `app/admin/alerts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-admin-signin-alert-workbench.md`
- Risk impact (if any): Low. This changes admin alert presentation only; alert sync, thresholds, attendance logic, feedback logic, and session actions remain unchanged.
- Verification:
  - `npm run build` passed
  - the admin page now groups alert rows by session card instead of showing one wide mixed table
  - quick-focus filters separate urgent, attendance-only, and feedback-only queues
  - feedback overdue timing is now displayed from the actual post-class feedback due time instead of the sign-in threshold time
- Rollback point: previous production commit before `2026-04-01-r08`.

## 2026-04-01-r09

- Release ID: `2026-04-01-r09`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the sign-in alert summary follow the current quick-focus filter.
- Key files:
  - `app/admin/alerts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-admin-signin-alert-focus-summary.md`
- Risk impact (if any): Low. This only changes the alert summary counts shown at the top of the page; sync rules, thresholds, card layout, and action links remain unchanged.
- Verification:
  - `npm run build` passed
  - when switching to `Urgent first`, `Attendance only`, or `Feedback only`, the top summary now matches the filtered queue instead of keeping the full-page totals
- Rollback point: previous production commit before `2026-04-01-r09`.

## 2026-04-01-r10

- Release ID: `2026-04-01-r10`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce confusion in the admin package-create flow by turning the large modal into a guided step-by-step form with a live summary card.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-flow-clarity.md`
- Risk impact (if any): Low. This changes package-create presentation only; package validation, package creation API behavior, settlement mode rules, and package ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - package creation now guides staff through four steps instead of one long form
  - a live summary card keeps student, course, balance, validity, payment, and settlement mode visible while filling the form
  - advanced sharing and note fields are moved into a secondary advanced section
- Rollback point: previous production commit before `2026-04-01-r10`.

## 2026-04-01-r11

- Release ID: `2026-04-01-r11`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Fine-tune the admin package-create flow so the default type matches common usage and staff get stronger balance reminders while creating packages.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-defaults-and-reminders.md`
- Risk impact (if any): Low. This changes package-create defaults and reminders only; package validation, package creation API behavior, settlement mode rules, and package ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - the default create type now starts from `HOURS / 课时包`
  - common minute presets are available for quick entry
  - selecting a student now shows active-package and same-course reminders before creation
- Rollback point: previous production commit before `2026-04-01-r11`.

## 2026-04-01-r12

- Release ID: `2026-04-01-r12`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add smarter course-based defaults and stronger duplicate-package warnings to the admin package-create flow.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-smart-defaults.md`
- Risk impact (if any): Low. This changes package-create suggestions and warnings only; package validation, package creation API behavior, settlement mode rules, and package ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - selecting a course now auto-suggests the most common minute balance used for that course
  - step 4 now shows a yellow warning when the same student already has active packages for the same course
  - manual minute edits still work and are not overwritten after staff starts typing
- Rollback point: previous production commit before `2026-04-01-r12`.

## 2026-04-01-r13

- Release ID: `2026-04-01-r13`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Align package-create minute presets and fallback suggestions with the teaching-office's real package patterns.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-minute-patterns.md`
- Risk impact (if any): Low. This only changes create-form defaults and preset chips; package creation API behavior, validation rules, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - normal package creation now shows 10h / 20h / 40h / 100h presets
  - New Oriental partner students now show 45-minute lesson presets (6 / 8 / 10 / 20 / 40 lessons)
  - course-based minute suggestions still work, and manual minute edits are not overwritten
- Rollback point: previous production commit before `2026-04-01-r13`.

## 2026-04-01-r14

- Release ID: `2026-04-01-r14`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make package creation default to ACTIVE and reduce mistakes in the package edit and top-up flow.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-topup-clarity.md`
- Risk impact (if any): Low. This changes admin package-create/edit presentation and defaults only; package creation API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - new packages now default to `ACTIVE`
  - edit and top-up now appear as separate focused flows inside the package modal
  - top-up now shows before/after balance summary and realistic quick presets for regular and New Oriental package patterns
- Rollback point: previous production commit before `2026-04-01-r14`.

## 2026-04-01-r15

- Release ID: `2026-04-01-r15`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce remaining package edit noise by hiding less-common fields and adding a stronger human confirmation in top-up.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-topup-followup-polish.md`
- Risk impact (if any): Low. This only changes the admin package modal presentation; package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - edit mode now keeps less-common fields inside a collapsed advanced block
  - paid-only fields in edit mode only expand when staff explicitly mark the package as paid
  - top-up now shows a clearer human confirmation sentence before submit
- Rollback point: previous production commit before `2026-04-01-r15`.
