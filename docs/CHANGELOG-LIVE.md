# CHANGELOG LIVE

This file is the single source of truth for what changed in production.

## Entry Template

- Release ID:
- Date/Time (Asia/Shanghai):
- Deployment status:
- Scope:
- Key files:
- Risk impact (if any):
- Verification:
- Rollback point:

---

## 2026-04-24-r103

- Release ID: `2026-04-24-r103`
- Date/Time (Asia/Shanghai): `2026-04-24`
- Deployment status: `READY`
- Scope: move the heavy student-contract workspace out of package billing into its own package contract page, and leave a lighter contract summary/entry point inside billing.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `docs/tasks/TASK-20260424-package-contract-workspace-page.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This changes admin navigation and where contract actions live, but does not change contract state rules, invoice creation, signed PDFs, or partner-settlement exclusions.
- Verification:
  - `npm run build`
  - verify package billing now shows a compact contract summary with `Open contract workspace`
  - verify `/admin/packages/[id]/contract` contains parent-link, draft, sign-link, replacement, and void-history actions
- Rollback point: previous production commit before `2026-04-24-r103`.

## 2026-04-24-r102

- Release ID: `2026-04-24-r102`
- Date/Time (Asia/Shanghai): `2026-04-24`
- Deployment status: `READY`
- Scope: fix the public handwritten-signature pad so a parent who draws and immediately clicks submit no longer gets bounced back as if no signature was provided.
- Key files:
  - `app/contract/_components/ContractSignaturePad.tsx`
  - `docs/tasks/TASK-20260424-contract-signature-pad-submit-sync.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes how the client-side sign pad syncs its hidden signature payload during drawing; it does not change contract wording, signed PDF generation, invoice creation, or package balance rules.
- Verification:
  - `npm run build`
  - verify drawing a signature and immediately clicking `Sign contract` now submits successfully instead of returning `Please draw the handwritten signature`
  - verify clearing the signature still empties the hidden signature payload
- Rollback point: previous production commit before `2026-04-24-r102`.

## 2026-04-23-r93

- Release ID: `2026-04-23-r93`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: let finance/ops delete disposable void contract drafts while moving all void contracts into collapsed history so old void rows no longer clutter or block the package billing contract workspace.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/tasks/TASK-20260423-contract-void-draft-delete-and-history.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This change only affects contract cleanup and display. Signed or invoiced void contracts remain preserved as history, and renewal contracts follow the same safe-delete rule.
- Verification:
  - `npm run build`
  - create a direct-billing contract draft, void it, then delete it and confirm the package returns to the normal create-contract state
  - confirm `VOID` contracts that were signed or invoiced stay in collapsed history and do not show a delete action
- Rollback point: previous production commit before `2026-04-23-r93`.

## 2026-04-23-r92

- Release ID: `2026-04-23-r92`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: unify direct-billing student-type semantics so the new parent-intake flow reuses the existing `自己学生-*` taxonomy instead of creating a separate `直客学生` branch, while direct-billing exports continue to recognize both names.
- Key files:
  - `lib/student-type-semantics.ts`
  - `lib/student-parent-intake.ts`
  - `app/api/exports/student-detail/[id]/route.ts`
  - `app/api/exports/student-schedule/[id]/route.ts`
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `docs/tasks/TASK-20260423-student-type-direct-billing-alias.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This change does not alter contract, invoice, receipt, package, or scheduling rules. It only normalizes which student type new direct-billing intake students receive and keeps export branding logic consistent across old and new labels.
- Verification:
  - query current student types and confirm direct-billing labels were split across `直客学生` and `自己学生-*`
  - create a fresh parent-intake submission and confirm the new student now lands on `自己学生-新生`
  - `npm run build`
  - verify student detail, student schedule, and package ledger exports now treat both `自己学生-*` and `直客学生` as direct-billing student types
- Rollback point: previous production commit before `2026-04-23-r92`.

## 2026-04-23-r91

- Release ID: `2026-04-23-r91`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: rework the direct-billing student contract flow so first purchases can start from a parent intake link before a student exists, renewals skip intake, and signed contracts automatically create the matching invoice draft.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260423154500_student_contract_flow_rework/migration.sql`
  - `prisma/migrations/20260423181500_add_student_parent_intakes/migration.sql`
  - `lib/student-contract.ts`
  - `lib/student-parent-intake.ts`
  - `lib/student-contract-template.ts`
  - `app/admin/students/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/student-intake/[token]/page.tsx`
  - `app/contract-intake/[token]/page.tsx`
  - `app/contract/[token]/page.tsx`
  - `app/api/exports/student-contract/[id]/route.ts`
  - `docs/tasks/TASK-20260423-student-contract-intake-renewal-auto-invoice.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This release adds a new pre-student parent-intake path, changes student-contract status progression, adds renewal-mode branching, and auto-creates invoice drafts after signing. It does not change partner-settlement package handling, receipt rules, scheduling gates, or finance-gate rules.
- Verification:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
  - local new-student QA confirmed `intake link -> parent submit -> student created -> first package setup -> ready to sign -> signed -> invoice created`
  - local renewal QA confirmed `renewal draft reuses parent info -> ready to sign -> signed -> invoice created`
  - verify first-purchase signing auto-created invoice `RGT-202604-0017`
  - verify renewal signing auto-created invoice `RGT-202604-0018`
  - verify renewal package finance gate moved to `INVOICE_PENDING_MANAGER`
  - verify QA cleanup removed the temporary test students, intakes, packages, contracts, approvals, and generated invoice drafts afterwards
- Rollback point: previous production commit before `2026-04-23-r91`.

## 2026-04-23-r90

- Release ID: `2026-04-23-r90`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: fix contradictory contract UI on partner-settlement packages so exempt packages no longer show student-contract creation entry points.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260423-partner-package-contract-ui-guard.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI consistency fix only. It does not change settlement mode, finance-gate status, partner billing logic, contract records, or any scheduling and finance workflow.
- Verification:
  - `npm run build`
  - confirm partner-settlement packages no longer show `Create contract draft` or `Create from package billing`
  - confirm the same pages now explain that partner-settlement packages stay outside the student contract workflow
- Rollback point: previous production commit before `2026-04-23-r90`.

## 2026-04-23-r89

- Release ID: `2026-04-23-r89`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: fix the new student contract PDF layout so long bilingual header text and summary values no longer overlap in downloaded contracts.
- Key files:
  - `lib/student-contract-pdf.ts`
  - `docs/tasks/TASK-20260423-student-contract-pdf-overlap-fix.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a layout-only follow-up for the student contract PDF. It does not change contract statuses, contract tokens, signing rules, file storage, package billing logic, invoice gates, or any scheduling workflow.
- Verification:
  - `npm run build`
  - generate a real student contract PDF and confirm the header title no longer collides with the company lines
  - confirm long student/course/package summary values no longer overlap inside the summary box
- Rollback point: previous production commit before `2026-04-23-r89`.

## 2026-04-23-r88

- Release ID: `2026-04-23-r88`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: add the first student-contract workflow for direct-billing packages, covering admin draft creation, parent intake, formal signing, and signed PDF export.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260423113000_add_student_contracts_phase1/migration.sql`
  - `lib/business-file-storage.ts`
  - `lib/student-contract-template.ts`
  - `lib/student-contract-pdf.ts`
  - `lib/student-contract.ts`
  - `app/contract/_components/ContractSignaturePad.tsx`
  - `app/contract-intake/[token]/page.tsx`
  - `app/contract/[token]/page.tsx`
  - `app/api/exports/student-contract/[id]/route.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260423-student-contract-phase-1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This release adds new public token flows, new Prisma tables, and contract PDF generation/storage. It does not change partner-settlement flows, invoice/receipt logic, scheduling logic, or existing package balances.
- Verification:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
  - library-level contract flow QA now passes through `create draft -> intake submit -> sign -> signed PDF saved`
  - browser QA now passes through `package billing -> intake link -> sign page -> signed success -> signed PDF download`
  - QA evidence captured in `tmp/qa-student-contract-flow-real-sign/`
- Rollback point: previous production commit before `2026-04-23-r88`.

## 2026-04-23-r87

- Release ID: `2026-04-23-r87`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: fix the parent statement PDF header so the bilingual statement title no longer overlaps the company name and generated-date lines when the title wraps.
- Key files:
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `docs/tasks/TASK-20260423-parent-statement-header-overlap-fix.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes only header layout in the parent statement PDF export. It does not affect statement totals, package status logic, invoice/receipt data, numbering, or any scheduling and finance workflows.
- Verification:
  - `npm run build`
  - export a parent statement PDF and confirm the top-right header block no longer overlaps
- Rollback point: previous production commit before `2026-04-23-r87`.

## 2026-04-21-r86

- Release ID: `2026-04-21-r86`
- Date/Time (Asia/Shanghai): `2026-04-21`
- Deployment status: `READY`
- Scope: turn the direct-billing package invoice gate into a real hard scheduling gate by removing the remaining finance-gate bypass paths from scheduling entry points.
- Key files:
  - `app/api/admin/enrollments/route.ts`
  - `app/api/admin/classes/[id]/sessions/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`
  - `app/api/admin/teachers/[id]/generate-sessions/route.ts`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/classes/[id]/sessions/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/tasks/TASK-20260421-direct-billing-invoice-gate-phase-3-hard-block.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium to high. This release removes the remaining soft-bypass path for `PACKAGE_FINANCE_GATE_BLOCKED`, so direct-billing chargeable packages that have not passed manager invoice approval will now be blocked consistently across scheduling APIs. Partner-settlement packages remain excluded, receipt is still not the first scheduling gate, and super admins still retain unrelated availability/admin powers but no longer bypass the finance gate itself.
- Verification:
  - `npm run build`
  - `npm run test:backend`
  - confirm no remaining runtime code paths bypass `PACKAGE_FINANCE_GATE_BLOCKED`
  - post-deploy: smoke-test quick schedule, enrollments, class session create/generate/reschedule, booking approval, teacher generate sessions, and ops execute against a pending direct-billing package
- Rollback point: previous production commit before `2026-04-21-r86`.

## 2026-04-21-r85

- Release ID: `2026-04-21-r85`
- Date/Time (Asia/Shanghai): `2026-04-21`
- Deployment status: `READY`
- Scope: ship Phase 1 and Phase 2 of the direct-billing package invoice gate so new direct-billing chargeable packages auto-create invoice drafts, enter manager approval, and soft-block scheduling flows until approval is complete.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260421183000_add_package_invoice_gate_phase1/migration.sql`
  - `lib/package-finance-gate.ts`
  - `lib/scheduling-package.ts`
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/enrollments/route.ts`
  - `app/api/admin/classes/[id]/sessions/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`
  - `app/api/admin/teachers/[id]/generate-sessions/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/approvals/page.tsx`
  - `app/admin/classes/[id]/ClassEnrollmentsClient.tsx`
  - `app/admin/classes/[id]/sessions/page.tsx`
  - `app/admin/enrollments/page.tsx`
  - `docs/tasks/TASK-20260421-direct-billing-invoice-gate-phase-1-and-2-release.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This release adds a new scheduling gate for direct-billing chargeable packages and touches multiple scheduling entry points. The main guardrails are that partner-settlement packages remain excluded, receipt is still not the first scheduling gate, and strict super admins can still bypass `PACKAGE_FINANCE_GATE_BLOCKED` during the soft-block phase. Migration order matters because the new code depends on the new `CoursePackage` finance-gate columns and `PackageInvoiceApproval` table.
- Verification:
  - `npx prisma migrate deploy` using the direct database URL, then verify the new `CoursePackage.financeGate*` columns and `PackageInvoiceApproval` table exist
  - `npm run build`
  - real-flow QA:
    - create a new direct-billing chargeable package
    - confirm invoice draft and `PackageInvoiceApproval` are auto-created
    - confirm package starts at `INVOICE_PENDING_MANAGER`
    - confirm scheduling decision returns `PACKAGE_FINANCE_GATE_BLOCKED` before manager approval
    - approve with a configured manager approver and confirm package becomes `SCHEDULABLE`
    - confirm partner-settlement package remains `EXEMPT`
  - UI QA artifacts captured under `tmp/qa-package-gate/`
- Rollback point: previous production commit before `2026-04-21-r85`.

## 2026-04-21-r84

- Release ID: `2026-04-21-r84`
- Date/Time (Asia/Shanghai): `2026-04-21`
- Deployment status: `READY`
- Scope: add a finance reconciliation workbook that lists every package created since SGT Manage went live and joins package, invoice, receipt, and payment-proof data for finance matching.
- Key files:
  - `lib/package-finance-reconciliation.ts`
  - `app/api/exports/package-finance-reconciliation/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/tasks/TASK-20260421-package-finance-reconciliation-report.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a read-only reporting export plus finance page links. It does not change package balances, package deduction, invoice numbering, receipt approval, or any scheduling workflow. The main caution is interpretation of historical mismatches, so the workbook exposes amount-basis source and exception rows instead of trying to silently normalize old data.
- Verification:
  - `npm run build`
  - confirm `/api/exports/package-finance-reconciliation` is present in the compiled route list
  - confirm finance workbench and student package invoice pages expose direct download links for the workbook
  - server-side follow-up after deploy: verify the workbook downloads and contains populated master / invoice / receipt-proof / exception sheets when production data exists
- Rollback point: previous production commit before `2026-04-21-r84`.

## 2026-04-17-r83

- Release ID: `2026-04-17-r83`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: tighten shared time-input sync and make quick-schedule conflict copy prioritize the student's own existing session before generic teacher/room blockers.
- Key files:
  - `app/_components/BlurTimeInput.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `lib/session-conflict.ts`
  - `tests/session-conflict.test.ts`
  - `docs/tasks/TASK-20260417-time-input-sync-and-quick-schedule-conflict-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This change touches a shared time input and shared quick-schedule conflict messaging paths, but it does not alter teacher-availability rules, room-occupancy rules, package validation, repeat scheduling writes, or the database-level duplicate-session guard.
- Verification:
  - `npx tsx --test tests/session-conflict.test.ts tests/availability-conflict.test.ts tests/admin-teacher-availability.test.ts tests/quick-schedule-execution.test.ts`
  - `npm run build`
  - data check still confirms Coco + Jasmine `2026-04-27 17:30-19:00` already exists in the database, so the new conflict copy now points ops at the real reason first
- Rollback point: previous production commit before `2026-04-17-r83`.

## 2026-04-17-r82

- Release ID: `2026-04-17-r82`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: harden the quick schedule modal so `Find Available Teachers / 查找可用老师` always refreshes the candidate snapshot instead of depending on a manual page reload.
- Key files:
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `docs/tasks/TASK-20260417-quick-schedule-refresh-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a quick-schedule UI refresh follow-up. The Coco + Jasmine investigation showed the target `2026-04-27 17:30-19:00` lesson already existed in the database, so this release does not change scheduling rules; it only forces the modal to refresh server-rendered candidate results after the user asks for a new lookup.
- Verification:
  - `npm run build`
  - data check confirms Coco + Jasmine `2026-04-27 17:30-19:00` already exists in the database
  - browser check confirms `Find Available Teachers / 查找可用老师` now refreshes the candidate snapshot without needing a full page refresh
- Rollback point: previous production commit before `2026-04-17-r82`.

## 2026-04-17-r81

- Release ID: `2026-04-17-r81`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: fix the shared scroll interception rule so student-detail month paging and other same-path query+hash links can navigate normally instead of being trapped as pure anchor jumps.
- Key files:
  - `app/_components/ScrollManager.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260417-scroll-manager-query-hash-navigation-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still a narrow navigation-layer fix. Pure same-page hash jumps keep working, but links that also change the query string now navigate normally so the server-rendered content can update. No scheduling logic, package logic, or approval logic changed.
- Verification:
  - `npm run build`
  - production browser check confirms student detail `Prev Month / 上月` and `Next Month / 下月` now visibly change the rendered month while staying on `#calendar-tools`
  - verify pure same-page hash jumps still scroll correctly
- Rollback point: previous production commit before `2026-04-17-r81`.

## 2026-04-17-r80

- Release ID: `2026-04-17-r80`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: fix the student-detail scheduling calendar month pager so prev/next month visibly reloads the correct month instead of only changing the URL.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/StudentCalendarMonthPagerClient.tsx`
  - `docs/tasks/TASK-20260417-student-calendar-month-pager-hard-refresh.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a narrow student-detail calendar navigation fix. The month calculation on the server was already correct; the change only forces the month pager to perform a full navigation so the visible calendar content stays aligned with the URL. No scheduling logic, package logic, or calendar data rules changed.
- Verification:
  - `npm run build`
  - browser check confirms `Prev Month / 上月` and `Next Month / 下月` now visibly change the rendered month while staying on `#calendar-tools`
- Rollback point: previous production commit before `2026-04-17-r80`.

## 2026-04-17-r79

- Release ID: `2026-04-17-r79`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: keep quick schedule and the schedule calendar prominent on student detail while surfacing remaining lesson hours earlier.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260417-student-workbench-scheduling-priority-and-remaining-hours.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still student-detail UI-only. The page now keeps the most-used scheduling tools prominent and shows remaining lesson hours earlier, but no package math, scheduling rules, routing behavior, or workflow logic changed.
- Verification:
  - `npm run build`
  - production browser check confirms student detail keeps quick schedule and calendar prominent, surfaces remaining lesson hours earlier, and still preserves the recommended-first-action pattern
- Rollback point: previous production commit before `2026-04-17-r79`.

## 2026-04-17-r78

- Release ID: `2026-04-17-r78`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: make the student detail workbench clearly recommend the next action, keep quick schedule and calendar prominent, surface remaining lesson hours earlier, and group the remaining links into lighter sections.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260417-student-workbench-recommendation-and-grouping.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still student-detail UI-only. The page now chooses a recommended first action based on current state, keeps quick schedule and calendar prominent, surfaces remaining lesson hours earlier, and groups the remaining links more clearly, but all destinations and workflow logic stay the same.
- Verification:
  - `npm run build`
  - production browser check confirms student detail now highlights one recommended first action, keeps quick schedule and calendar prominent, surfaces remaining lesson hours earlier, groups secondary links, and keeps the sticky shortcut row as a separate jump layer
- Rollback point: previous production commit before `2026-04-17-r78`.

## 2026-04-16-r77

- Release ID: `2026-04-16-r77`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: simplify the student detail workbench block so it no longer reads like a second dense dashboard under the new sticky shortcut row.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260416-student-workbench-density-reset.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is UI-only on the student detail page. The student workbench now emphasizes a few primary actions and lighter secondary links, but all destinations, anchors, and workflow logic stay the same.
- Verification:
  - `npm run build`
  - production browser check confirms the student detail workbench no longer shows the old equal-weight card wall and still works with the compact sticky shortcut row above it
- Rollback point: previous production commit before `2026-04-16-r77`.

## 2026-04-16-r76

- Release ID: `2026-04-16-r76`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: clean up compact sticky shortcut labels so dense workbenches stop leaking count fragments into the new lightweight navigation row.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-compact-sticky-label-cleanup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still UI-only. The shortcut generator now prefers the bold primary heading inside each source link, which keeps labels clean without changing workflow rules, queue behavior, approvals, or routing.
- Verification:
  - `npm run build`
  - production browser check confirms expense claims now shows clean compact labels without count fragments, while student detail and ticket center keep the same lighter row with `More / 更多`
  - confirm expense-claims split-view detail pane remains sticky
- Rollback point: previous production commit before `2026-04-16-r76`.

## 2026-04-16-r75

- Release ID: `2026-04-16-r75`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: slim the generated admin sticky shortcut strips so they feel like lightweight navigation instead of dense mini workbenches.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-compact-sticky-density-reduction.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still UI-only. The compact sticky row now shows only the first few links inline, moves the rest into `More / 更多`, and strips noisy count-heavy labels. No workflow rules, approval logic, routing behavior, or queue logic changed.
- Verification:
  - `npm run build`
  - production browser check confirms student detail, ticket center, and expense claims now show the lighter compact sticky row with at most 3 inline links plus `More / 更多`
  - confirm expense-claims split-view detail pane remains sticky
- Rollback point: previous production commit before `2026-04-16-r75`.

## 2026-04-16-r74

- Release ID: `2026-04-16-r74`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: turn the downgraded oversized admin work maps into compact sticky shortcut strips instead of removing sticky access entirely.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-compact-sticky-shortcuts.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still UI-only. The guard now generates a compact sticky shortcut row from existing page links while the original large work map stays in normal flow. No workflow rules, queue rules, or routing logic changed.
- Verification:
  - `npm run build`
  - production-build browser check confirms student detail, ticket center, expense claims, and receipts approvals now keep a thin sticky shortcut row after the large work map is downgraded
  - confirm the expense-claims split-view detail pane remains sticky
- Rollback point: previous production commit before `2026-04-16-r74`.

## 2026-04-16-r73

- Release ID: `2026-04-16-r73`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: add an admin-layout sticky guard so oversized work-map bars stop covering the content below them.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-sticky-workmap-guard.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI-only layout guard that downgrades large sticky work-map panels to normal flow blocks while leaving smaller sticky detail panes and table headers alone. No approval, ticket, scheduling, attendance, package, or finance rules changed.
- Verification:
  - `npm run build`
  - production-build browser check confirms the large work-map bar no longer sticks on the main affected admin pages, including student detail, expense claims, receipts approvals, todos, tickets, partner settlement, teachers, classes, finance workbench, and attendance detail
  - confirm split-view right detail panes still stay sticky where they are intentionally narrow
- Rollback point: previous production commit before `2026-04-16-r73`.

## 2026-04-16-r72

- Release ID: `2026-04-16-r72`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: fix the approval inbox narrow-width overflow found during the next real admin QA sweep.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `docs/tasks/TASK-20260416-admin-approval-inbox-narrow-width-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI-only responsive follow-up that tightens the approval inbox table/grid widths so the page fits with the admin sidebar visible. No approval routing, counts, lanes, or business logic changed.
- Verification:
  - `npm run build`
  - verify `/admin/approvals?focus=manager` no longer overflows horizontally around a `1024px` viewport width
  - verify the neighboring high-frequency workbenches (`expense-claims`, `receipts-approvals`, `todos`, `tickets`) still remain overflow-free at the same width
- Rollback point: previous production commit before `2026-04-16-r72`.

## 2026-04-16-r71

- Release ID: `2026-04-16-r71`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: fix the two real admin work-map anchor issues found during post-ship QA on partner settlement and conflicts.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/conflicts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-ux-phase-3a-anchor-followup.md`
- Risk impact (if any): Low. This is a narrow UI-only follow-up that only adjusts anchor targets and scroll offsets after QA. No settlement rules, conflict rules, or scheduling logic changed.
- Verification:
  - `npm run build`
  - verify `Partner Settlement / 合作方结算中心` work-map jump to `Action queue / 待处理队列` no longer lands under the sticky header
  - verify `Conflict Center / 冲突处理中心` work-map jump to `Conflict cards / 冲突卡片` still lands on a valid target even when the selected range currently has zero conflicts
- Rollback point: previous production commit before `2026-04-16-r71`.

## 2026-04-16-r70

- Release ID: `2026-04-16-r70`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: finish the next admin UX consistency pass on packages, partner settlement, teacher payroll, and conflicts with better remembered context, clearer banners, and more consistent status signals.
- Key files:
  - `app/admin/packages/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/conflicts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-ux-patterns-phase-3.md`
- Risk impact (if any): Low to medium. This release is still UI-only, but it expands remembered desk behavior and shared feedback/state components into more finance-heavy pages. The main watchpoints are making sure reset links clear remembered filters cleanly and that payroll/settlement status displays still mirror the same underlying workflow state as before.
- Verification:
  - `npm run build`
  - packages should keep scroll position, show clearer risk/status chips, and use shared next-step banners for resumed filters, post-action focus, and empty states
  - partner settlement should resume the last workbench view more clearly, keep scroll position, and show shared banners for schema issues, action outcomes, selected-item empty states, and empty pending-record queues
  - teacher payroll should resume its last desk filters only on normal return, clear properly through the default-desk link, and show shared action banners plus unified workflow chips in both queue and table views
  - conflicts should remember the last date/filter range on normal return, clear properly through the explicit reset link, preserve scroll position, and show shared chips/banners for conflict tags and empty-range states
- Rollback point: previous production commit before `2026-04-16-r70`.

## 2026-04-16-r69

- Release ID: `2026-04-16-r69`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: add the second layer of admin UX consistency improvements for remembered desks, shared status chips, clearer form sections, and steadier split workbenches.
- Key files:
  - `app/admin/_components/TeacherFilterForm.tsx`
  - `app/admin/_components/WorkbenchFormSection.tsx`
  - `app/admin/_components/WorkbenchSplitView.tsx`
  - `app/admin/_components/WorkbenchStatusChip.tsx`
  - `app/admin/_components/workbenchStyles.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/classes/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/teachers/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-ux-patterns-phase-2.md`
- Risk impact (if any): Low to medium. This release is still UI-only, but it expands shared admin UX helpers and remembered desk behavior across multiple high-frequency pages. The main watchpoint is making sure filter memory feels helpful, not sticky, when users intentionally clear back to the default desk.
- Verification:
  - `npm run build`
  - ticket, teacher, and class desks should resume remembered filters only when returning normally, and should clear cleanly with the explicit default-desk links
  - approvals, tickets, and receipts should show clearer shared status chips instead of mixed ad-hoc badges
  - expense claims review and finance sections should keep a steadier split-pane layout without changing workflow behavior
  - students list should now remember scroll position like other high-frequency desks
- Rollback point: previous production commit before `2026-04-16-r69`.

## 2026-04-16-r68

- Release ID: `2026-04-16-r68`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: finish the current admin workbench UI consistency pass and fix same-page anchor scrolling inside the admin scroll container.
- Key files:
  - `app/_components/ScrollManager.tsx`
  - `app/admin/_components/WorkbenchActionBanner.tsx`
  - `app/admin/_components/WorkbenchScrollMemoryClient.tsx`
  - `app/admin/_components/workbenchStyles.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-workbench-ui-consistency-and-anchor-scroll.md`
- Risk impact (if any): Low to medium. This release is a broad admin UI/interaction polish pass across high-frequency pages. It does not change business rules, but it does touch shared navigation behavior and queue-page continuity, so the main watchpoint is making sure same-path stateful navigation still preserves context while same-page anchor jumps now correctly move the admin scroll container.
- Verification:
  - `npm run build`
  - local browser QA on `/admin/approvals`, `/admin/todos`, `/admin/tickets`, `/admin/expense-claims`, `/admin/feedbacks`, and `/admin/receipts-approvals`
  - shared workbench result banners should now explain success/failure/next-step outcomes more consistently on the main queue pages
  - the tested pages should not show obvious narrow-width horizontal overflow in the local QA pass
  - clicking work-map anchor links should now move to the target section inside the admin `.app-main` scroll container
  - target sections should not hide under the sticky workbench bar after anchor navigation
- Rollback point: previous production commit before `2026-04-16-r68`.

## 2026-04-16-r67

- Release ID: `2026-04-16-r67`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: unify the teacher after-class feedback late-deadline logic and make the late rule visible on the teacher session pages.
- Key files:
  - `lib/feedback-timing.ts`
  - `app/api/teacher/sessions/[id]/feedback/route.ts`
  - `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/teacher/sessions/page.tsx`
  - `lib/signin-alerts.ts`
  - `app/admin/alerts/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/api/admin/feedbacks/bulk-forward-overdue/route.ts`
  - `app/api/admin/feedbacks/proxy-draft/route.ts`
  - `tests/feedback-timing.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-feedback-deadline-clarity.md`
- Risk impact (if any): Low. This release does not change the business rule itself; feedback still becomes late only 12 hours after class end. The change centralizes that rule into one helper and makes the same deadline clearer across teacher pages, teacher submit responses, admin alerts, and admin feedback handling.
- Verification:
  - `npx tsx --test tests/feedback-timing.test.ts`
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npm run build`
  - teacher session detail should explicitly show when late starts instead of only saying “overdue”
  - teacher feedback submit success should say whether the save is still on time or already late
  - teacher session list, admin alerts, and admin feedback overdue workbench should still follow the same 12-hour deadline
- Rollback point: previous production commit before `2026-04-16-r67`.

## 2026-04-15-r66

- Release ID: `2026-04-15-r66`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: polish the approval and receipt UX after the finance-only receipt approval change.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-approval-receipt-ux-polish.md`
- Risk impact (if any): Low. This is a UI/copy cleanup plus removal of no-longer-used receipt manager approval page actions. Teacher payroll manager approval, partner settlement manager approval, expense approval, receipt finance approval, receipt creation, export gates, and super-admin correction behavior stay unchanged.
- Verification:
  - `npm run build`
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - narrow Approval Inbox rows should stack more cleanly instead of forcing a table-like horizontal layout
  - receipt detail should explain legacy manager entries as audit history only
  - super-admin correction copy should refer to the selected parent receipt instead of implying every selected receipt is already approved
  - receipt manager approve/reject page actions should no longer be present in the receipt approval page
- Rollback point: previous production commit before `2026-04-15-r66`.

## 2026-04-15-r65

- Release ID: `2026-04-15-r65`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: simplify parent and partner receipt approval so generated receipts require finance approval only, while keeping unrelated manager-approval workflows unchanged.
- Key files:
  - `lib/receipt-approval-policy.ts`
  - `lib/approval-inbox.ts`
  - `lib/global-invoice-sequence.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/history/export/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/parent-receipt/[id]/route.ts`
  - `app/api/exports/partner-receipt/[id]/route.ts`
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-receipt-finance-only-approval.md`
- Risk impact (if any): Medium-low. This intentionally changes only the receipt approval policy from manager+finance to finance-only. It does not change teacher payroll manager approval, partner settlement approval, expense approval, receipt creation, payment proof linking, invoice math, package balance math, or super-admin correction rules.
- Verification:
  - `npm run build`
  - receipt reminders should still appear in Approval Inbox, but only under `Finance approval / 财务审批`
  - receipt manager approve/reject controls should no longer appear in the receipt approval center
  - finance should be able to approve a parent or partner receipt without prior manager approval
  - formal parent and partner receipt PDF exports should unlock after finance approval
  - finance workbench, package billing, parent statement, partner billing, and receipt history export should classify receipts using finance-only approval status
- Rollback point: previous production commit before `2026-04-15-r65`.

## 2026-04-15-r64

- Release ID: `2026-04-15-r64`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: add teacher payroll approval reminders into the unified Approval Inbox so management and finance can see payroll items that need their action.
- Key files:
  - `lib/teacher-payroll.ts`
  - `lib/approval-inbox.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-approval-inbox-teacher-payroll.md`
- Risk impact (if any): Low. This release only adds teacher payroll records to the existing approval reminder aggregation and adds a return banner from payroll back to the inbox. It does not change teacher payroll calculation, manager approval rules, finance confirmation rules, finance rejection rules, or payout logic.
- Verification:
  - `npm run build`
  - teacher payroll records that are teacher-confirmed but not manager-approved should appear in the manager approval lane
  - teacher payroll records that are manager-approved but not finance-confirmed or not paid should appear in the finance approval lane
  - Approval Inbox should show `Teacher payroll / 老师工资` rows with payroll totals when available
  - opening a teacher payroll reminder should focus the teacher payroll page and show a return banner back to Approval Inbox
- Rollback point: previous production commit before `2026-04-15-r64`.

## 2026-04-15-r63

- Release ID: `2026-04-15-r63`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: ship the next UX-continuity batch by extending Todo Center return paths into ticket and attendance flows, standardizing source-return banners, tightening student-detail first-screen weight, improving queue empty states, and stabilizing remaining two-column workbench layouts.
- Key files:
  - `app/admin/_components/WorkflowSourceBanner.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/sessions/[id]/attendance/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-ux-batch7-todo-continuity-status-empty-states.md`
- Risk impact (if any): Low. This release changes navigation continuity, status wording, empty-state guidance, first-screen grouping, and layout sizing only. It does not change approval rules, receipt math, attendance deduction rules, ticket status permissions, scheduling logic, or student/package data.
- Verification:
  - `npm run build`
  - Todo Center attendance and ticket links should carry a visible return path back to the original todo section
  - ticket detail and attendance pages should show a `From Todo Center / 来自待办中心` banner when opened from Todo Center
  - source banners for approval, receipt, package, and student-list workflows should use the same layout pattern
  - student detail should put next actions first and keep the profile snapshot collapsed until needed
  - package billing and todo empty states should explain what is empty and where to go next
  - expense claim split queues should keep their right-side detail panels aligned to their own content height
- Rollback point: previous production commit before `2026-04-15-r63`.

## 2026-04-14-r62

- Release ID: `2026-04-14-r62`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: extend the workflow-continuity UX batch by preserving “where you came from” between Students, Student Detail, Coordination, Receipt Queue, and Package Billing, while also tightening Package Billing into a more compact first-screen workspace with action-first receipt states.
- Key files:
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch6-workflow-continuity-and-package-billing.md`
- Risk impact (if any): Low. This release only changes navigation continuity, first-screen information grouping, and action-first status wording on existing admin pages. It does not change billing rules, receipt approval rules, student data, or scheduling behavior.
- Verification:
  - `npm run build`
  - student links opened from the list should carry a return path into student detail and coordination
  - package billing opened from receipt approvals should show a visible return path back to the same receipt queue
  - package billing first screen should show summary context first and keep create-invoice behind an expandable section
  - package receipt progress and approval states should read more action-first
- Rollback point: previous production commit before `2026-04-14-r62`.

## 2026-04-14-r61

- Release ID: `2026-04-14-r61`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: hotfix the expense-claims dual-queue layout so the selected detail panels keep their own content height instead of stretching to match a long left queue.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-expense-queue-panel-height-hotfix.md`
- Risk impact (if any): Low. This release only changes the grid alignment and selected-panel sizing inside Expense Claims. It does not change approval rules, queue data, payment logic, or navigation flow.
- Verification:
  - `npm run build`
  - submitted review queue should no longer stretch the selected panel to the same height when the left list is long
  - finance queue should no longer stretch the selected payout group panel to the same height when the left list is long
- Rollback point: previous production commit before `2026-04-14-r61`.

## 2026-04-14-r60

- Release ID: `2026-04-14-r60`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: extend the tighter queue-workbench pattern into Approval Inbox and Expense Claims by compressing approval-row scan density, making expense review and finance groups easier to compare, and adding previous/next navigation inside the selected expense panels.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch5-approval-and-expense-density-navigation.md`
- Risk impact (if any): Low. This release only changes approval-list density, queue-navigation affordances, and selected-panel guidance on existing approval pages. It does not change expense approval rules, payment rules, or receipt logic.
- Verification:
  - `npm run build`
  - approval inbox rows should read more compactly without losing key metadata
  - expense review should show previous/next navigation for submitted claims
  - finance queue should show previous/next navigation for approved-unpaid groups
- Rollback point: previous production commit before `2026-04-14-r60`.

## 2026-04-14-r59

- Release ID: `2026-04-14-r59`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: tighten the receipt-approval workbench one more step by compressing queue cards into faster-scan metadata rows and turning the detail drawer into a clearer processing cockpit with queue position plus previous/next navigation.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch4-receipt-queue-density-and-drawer-navigation.md`
- Risk impact (if any): Low. This release only changes layout density, summary duplication, and intra-queue navigation inside the existing receipt approval workbench. It does not change receipt approvals, payment-proof repair rules, billing math, or audit behavior.
- Verification:
  - `npm run build`
  - receipt queue cards should show a shorter inline metadata row instead of three stacked detail lines
  - selected receipt drawer should show queue position and explicit previous/next navigation
  - receipt detail should no longer repeat the same receipt/type/invoice summary in multiple stacked blocks
- Rollback point: previous production commit before `2026-04-14-r59`.

## 2026-04-14-r58

- Release ID: `2026-04-14-r58`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: ship the third UX-efficiency batch by making approval and queue status language more action-first, keeping a visible “from Approval Inbox” return path inside receipt approvals and expense claims, and preserving that source workflow when users keep moving through the linked review actions.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `lib/approval-inbox.ts`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch3-approval-language-and-return-paths.md`
- Risk impact (if any): Low. This release only changes navigation continuity, status wording, and workflow context banners on existing approval-driven admin pages. It does not change receipt approval rules, expense approval permissions, billing math, or data mutation rules.
- Verification:
  - `npm run build`
  - opening an item from `/admin/approvals` should carry `source=approvals` into receipt approvals or expense claims
  - receipt approvals and expense claims should show a visible “From Approval Inbox” return banner when entered from that workflow
  - pending statuses should read as action-oriented next steps instead of only passive state labels
- Rollback point: previous production commit before `2026-04-14-r58`.

## 2026-04-14-r57

- Release ID: `2026-04-14-r57`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: ship the second UX-efficiency batch by tightening the receipt-approval queue into a clearer processing workbench, pushing expense-approval config below the live queues, and finally making the dedicated student coordination page behave like a true light-shell workspace instead of still carrying the rest of the long student detail flow.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch2-receipts-expense-coordination.md`
- Risk impact (if any): Low. This release only changes layout emphasis, information density, and workspace shell behavior on existing admin pages. It does not change receipt math, approval rules, expense-claim decisions, student data, scheduling logic, or package behavior.
- Verification:
  - `npm run build`
  - receipt approvals should show a stronger current-work-focus strip and queue-display controls with visible counts
  - expense claims should keep approval config below the live queues instead of taking first-screen space
  - `/admin/students/[id]/coordination` should no longer render the long calendar, packages, attendance, quick-schedule, and edit sections underneath the coordination workspace
- Rollback point: previous production commit before `2026-04-14-r57`.

## 2026-04-14-r56

- Release ID: `2026-04-14-r56`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: start the first UX-efficiency batch from the 2026-04-14 review by compressing the admin dashboard first screen, turning approval inbox into a denser action-oriented review list, and making student-list dataset scope plus restored-filter state much harder to misread.
- Key files:
  - `app/admin/page.tsx`
  - `app/admin/approvals/page.tsx`
  - `app/admin/students/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch1-dashboard-approvals-students.md`
- Risk impact (if any): Low. This release only changes presentation density, layout emphasis, current-scope messaging, and navigation affordances on existing admin pages. It does not change approval rules, receipt math, billing state, scheduling logic, student data, or package behavior.
- Verification:
  - `npm run build`
  - admin dashboard should show a tighter first screen with priority work and compact operational metrics
  - approval inbox should show filter counts and a denser review list instead of only large action cards
  - student list should clearly show current dataset scope and warn users when the system restored a previous desk or filter context
- Rollback point: previous production commit before `2026-04-14-r56`.

## 2026-04-14-r55

- Release ID: `2026-04-14-r55`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: stop the approval-inbox filter chips and item links from using full-page anchor navigation, so switching filters inside `/admin/approvals` no longer hard-refreshes the shared left sidebar.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-approval-inbox-client-navigation.md`
- Risk impact (if any): Low. This release only swaps approval-inbox links from full-document anchors to Next.js client navigation inside the existing admin layout. It does not change approval data, counts, filters, receipt logic, expense logic, or sidebar contents.
- Verification:
  - `npm run build`
  - switching between `/admin/approvals` filters should no longer hard-refresh the left admin sidebar
  - opening approval items from the inbox should use the same client-side navigation behavior where applicable
- Rollback point: previous production commit before `2026-04-14-r55`.

## 2026-04-14-r54

- Release ID: `2026-04-14-r54`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: add a first unified `Approval Inbox / 审批提醒中心` that consolidates pending parent receipt, partner receipt, and expense-claim approvals into one admin page, while also surfacing the same pending counts in the sidebar and admin home summary cards.
- Key files:
  - `lib/approval-inbox.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-approval-inbox-v1.md`
- Risk impact (if any): Low. This release adds a read-only cross-workspace approval summary and new navigation entry points for manager, finance, and super-admin users. It does not change the underlying approval rules, approval order, receipt math, expense-claim decisions, billing data, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - `/admin/approvals` should show pending parent receipt, partner receipt, and expense-claim items relevant to the current user
  - sidebar navigation should expose `Approval Inbox / 审批提醒` with a live pending count for admin and finance users
  - admin home summary should show the new pending-approvals card and link into `/admin/approvals`
- Rollback point: previous production commit before `2026-04-14-r54`.

## 2026-04-14-r53

- Release ID: `2026-04-14-r53`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: allow strict super-admin `zhao hongwei` to directly correct approved parent receipts in place from the receipt detail drawer without forcing a revoke-and-redo loop, while preserving existing approvals and writing every change into the audit log.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-super-admin-direct-parent-receipt-correction.md`
- Risk impact (if any): Medium. This release intentionally lets one strict super-admin edit approved parent receipt fields in place and keep prior approvals valid. The scope is limited to parent receipts, still writes audit logs, and still blocks cumulative amountReceived from exceeding the linked invoice total.
- Verification:
  - `npm run build`
  - only `zhao hongwei` should see the direct correction form on parent receipt details
  - direct correction should allow updating receipt date, received from, paid by, amount, gst, total, amount received, and note
  - existing approvals should remain intact after a direct correction
  - direct correction should still reject amountReceived values that would push the linked invoice above its total
- Rollback point: previous production commit before `2026-04-14-r53`.

## 2026-04-14-r52

- Release ID: `2026-04-14-r52`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: let finance backfill or correct amounts on existing parent payment-proof records inline, and require a final click-through confirmation when a new receipt amount diverges from the invoice remaining balance or the selected proof amount.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/ConfirmCreateReceiptButton.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-parent-proof-amount-backfill-and-confirmation.md`
- Risk impact (if any): Low. This release adds finance-side metadata editing for existing parent payment proofs and a submit-time confirmation guard for create-receipt mismatches. It does not change invoice math, receipt numbering, payment-record uniqueness, approval decisions, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - existing payment-proof rows should allow finance to save or update a proof amount inline
  - create-receipt submit should pop a confirmation when amount received is above or below invoice remaining balance
  - create-receipt submit should also pop a confirmation when amount received differs from the selected proof amount
- Rollback point: previous production commit before `2026-04-14-r52`.

## 2026-04-13-r51

- Release ID: `2026-04-13-r51`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: add an optional amount field to parent payment-proof records so finance can compare selected proof amounts against invoice remaining balance and entered receipt amounts with real data instead of guesswork.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/ReceiptAmountReceivedField.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-payment-proof-amount.md`
- Risk impact (if any): Low. This release adds an optional payment-proof amount field for parent billing and uses it for finance-side comparison hints only. It does not change receipt numbering, remaining-balance caps, payment-record uniqueness, approval logic, statement math, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - payment-proof upload and replacement should allow entering an optional amount
  - existing payment-record tables and selectors should show stored proof amounts when available
  - receipt create form should compare entered amount against both invoice remaining balance and selected proof amount when that proof amount exists
- Rollback point: previous production commit before `2026-04-13-r51`.

## 2026-04-13-r50

- Release ID: `2026-04-13-r50`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: finish the next round of finance-side parent partial-receipt improvements by adding a dedicated partial-receipt follow-up queue in finance workbench, a downloadable invoice receipt progress CSV, stronger create-form amount warnings, and more automatic next-receipt shortcuts that carry the only unlinked proof when it is unambiguous.
- Key files:
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/ReceiptAmountReceivedField.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-receipt-finance-polish.md`
- Risk impact (if any): Low. This release improves finance-facing queueing, export, shortcut, and warning UX around parent partial receipts. It does not change receipt numbering rules, amount-validation caps, payment-record uniqueness, approval decisions, statement math, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - finance workbench should expose a dedicated partial-receipt follow-up queue sorted by due date and remaining amount
  - finance workbench should export an invoice receipt progress CSV for the current filtered dataset
  - package billing should carry the only unlinked payment proof into next-receipt shortcuts when that recommendation is unambiguous
  - receipt create form should show live warnings when amount received is above or below the invoice remaining balance
- Rollback point: previous production commit before `2026-04-13-r50`.

## 2026-04-13-r49

- Release ID: `2026-04-13-r49`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: make parent partial-receipt follow-up actions more explicit by exposing the exact next receipt number in package billing and receipt-approval detail shortcuts, so finance can jump straight into `RC2`, `RC3`, and later receipts instead of guessing from a generic "next receipt" label.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-next-receipt-shortcuts.md`
- Risk impact (if any): Low. This release only changes finance-facing shortcut labels and navigation hints for follow-up parent receipts. It does not change receipt numbering rules, amount validation, proof-link uniqueness, approvals, statement math, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - package billing invoice rows with remaining balance should show `Create RC2` / `Create RC3` style actions plus the full next receipt number
  - receipt-approval package workspace next-step helper should expose the same explicit `RC2` / `RC3` label when a next receipt is recommended
  - selected parent receipt details should show a dedicated next partial-receipt card that opens the create step with the same invoice only, without reusing the current linked payment proof
- Rollback point: previous production commit before `2026-04-13-r49`.

## 2026-04-13-r48

- Release ID: `2026-04-13-r48`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: add automated parent partial-receipt backend coverage and fix the leftover receipt-number validator so `-RC2`, `-RC3`, and later receipts are accepted by the store layer instead of being blocked by the old single-receipt regex.
- Key files:
  - `lib/student-parent-billing.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-receipt-tests-and-validator-fix.md`
- Risk impact (if any): Medium. This release changes backend receipt-number validation for parent receipts and adds automated coverage around multi-receipt edge cases. It does not change partner billing, finance approvals, statement math, package deduction logic, scheduling, sessions, or package behavior.
- Verification:
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npm run test:backend`
  - `npm run build`
  - the backend should now accept `InvoiceNo-RC2`, `InvoiceNo-RC3`, and later parent receipt numbers
  - tests should cover numbering progression, valid second partial receipt creation, over-receipt blocking, and duplicate payment-record rejection
- Rollback point: previous production commit before `2026-04-13-r48`.

## 2026-04-13-r47

- Release ID: `2026-04-13-r47`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: streamline the next parent receipt creation flow by surfacing a recommended next-receipt card, carrying the next receipt number into invoice pickers, and auto-selecting the most usable unlinked payment proof when possible.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-next-receipt-helper.md`
- Risk impact (if any): Low. This release only improves finance-side guidance and default selections inside the create-receipt workspace. It does not change receipt numbering rules, amount validation, approvals, statement math, package deduction logic, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - package finance workspace should show a recommended next-receipt card with invoice no., next receipt no., remaining amount, and suggested proof
  - when only one usable unlinked payment record exists, it should auto-select and explain why
  - `Create the next receipt` package helper should open the create step with the recommended invoice and proof already carried in the URL
  - invoice pickers in the create flow should show the next receipt number alongside remaining amount
- Rollback point: previous production commit before `2026-04-13-r47`.

## 2026-04-13-r46

- Release ID: `2026-04-13-r46`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: make parent partial-receipt progress easier for finance to read by surfacing invoice-level receipt totals, remaining balance, and next-step context in package billing, statement export, and receipt-history export.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `app/admin/receipts-approvals/history/export/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-receipt-visibility.md`
- Risk impact (if any): Low. This release only improves finance-facing visibility for invoice receipt progress and remaining balance; it does not change parent receipt numbering, approval rules, payment-record linking, package deduction logic, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - package billing should show each invoice's receipt count, created/approved/pending amounts, and remaining amount
  - each receipt row in package billing should show the linked invoice's overall receipt progress
  - statement PDF should include an invoice receipt breakdown section so finance can see partial receipt progress per invoice
  - receipt history CSV should export invoice total, receipt count, receipted amount, pending amount, and remaining amount for parent receipts
- Rollback point: previous production commit before `2026-04-13-r46`.

## 2026-04-13-r45

- Release ID: `2026-04-13-r45`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: support multiple parent receipts on the same invoice for partial payments, keep the first receipt number as `-RC`, continue later receipts as `-RC2`, `-RC3`, and make finance pages show remaining receiptable amount instead of blocking after the first receipt.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-multi-receipt.md`
- Risk impact (if any): Medium. This release changes parent receipt numbering, invoice-to-receipt linking rules, finance workbench status interpretation, and create-receipt defaults for partial payments. It intentionally does not change partner billing, package deduction logic, scheduling, sessions, packages, or finance approvals themselves.
- Verification:
  - `npm run build`
  - a parent invoice with one approved partial receipt should still remain selectable in `/admin/receipts-approvals` while it has remaining receiptable amount
  - the next auto-generated receipt number should be `InvoiceNo-RC2`, `InvoiceNo-RC3`, etc., while the first receipt stays `InvoiceNo-RC`
  - create-receipt defaults should show `already receipted` and `remaining to receipt`, and should default the new receipt amount to the remaining amount
  - finance workbench should show `Partially Receipted / 部分已开收据` instead of treating the invoice as fully finished after the first approved partial receipt
  - over-receipting should be blocked, while valid partial receipts should no longer be flagged as a mismatch by default
- Rollback point: previous production commit before `2026-04-13-r45`.

## 2026-04-12-r44

- Release ID: `2026-04-12-r44`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: add an obvious close/return action inside the dedicated student coordination workspace so ops can leave the workspace without getting stuck on that page.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-student-coordination-close-button.md`
- Risk impact (if any): Low. This release only adjusts student-detail coordination navigation labels and destinations; it does not change coordination tickets, helper generation, parent availability, quick scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - the student-detail workbench should show `Close coordination workspace / 关闭排课协调工作台` instead of another open-link when already inside `/admin/students/[id]/coordination`
  - the dedicated coordination page header should also expose the same close action back to the main student detail page
  - closing the workspace should return to `/admin/students/[id]` without affecting any coordination state
- Rollback point: previous production commit before `2026-04-12-r44`.

## 2026-04-12-r43

- Release ID: `2026-04-12-r43`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: move the student-detail scheduling-coordination workspace out of the already crowded profile page into its own dedicated student coordination page, while leaving the coordination logic itself unchanged.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/coordination/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-student-detail-coordination-dedicated-page.md`
- Risk impact (if any): Low to medium. This release changes student-detail navigation and where coordination actions live, but it does not change ticket logic, parent-time matching, quick scheduling rules, teacher availability, sessions, packages, deductions, or finance behavior.
- Verification:
  - `npm run build`
  - `/admin/students/[id]` should now show a concise coordination summary card instead of the full coordination workspace
  - the new `/admin/students/[id]/coordination` page should load the full existing coordination workspace
  - student-detail coordination buttons, helper forms, and ticket back-links should now open or return to the dedicated coordination page
  - the rest of student detail should remain usable without the large coordination block in the middle of the page
- Rollback point: previous production commit before `2026-04-12-r43`.

## 2026-04-12-r42

- Release ID: `2026-04-12-r42`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: rebalance calendar-mode coordination candidates so the first helper slots cover more of the parent's selected dates instead of letting earlier dates consume the whole shortlist.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-coordination-calendar-date-coverage.md`
- Risk impact (if any): Low. This release does not change teacher availability, parent payload matching rules, ticket lifecycle, or scheduling storage; it only changes how already-matched calendar-date slots are prioritized before the helper trims them to a short list.
- Verification:
  - `npm run build`
  - for calendar-mode parent submissions with several selected dates, the first helper shortlist should try to surface at least one option from each requested date before repeating earlier dates
  - the underlying matching rules should stay the same, so dates with no matching teacher availability should still be absent
  - the existing example ticket `20260409-004` should now surface `2026-04-11`, `2026-04-13`, `2026-04-19`, and `2026-04-20` inside the first five generated options instead of concentrating mostly on the earliest two dates
- Rollback point: previous production commit before `2026-04-12-r42`.

## 2026-04-12-r41

- Release ID: `2026-04-12-r41`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: make scheduling-coordination helper status stop claiming a confirmed ticket is ready to schedule after the parent re-submits availability, and generate candidate slots by searching the parent-submitted availability window before filtering.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `app/availability/[token]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-coordination-manual-review-and-parent-window-match.md`
- Risk impact (if any): Medium. This release changes scheduling-coordination helper interpretation and candidate-slot generation, but it keeps the existing parent-availability payload, ticket lifecycle, teacher availability storage, quick scheduling, sessions, packages, deductions, and finance logic unchanged.
- Verification:
  - `npm run build`
  - a coordination ticket that was already `Confirmed` and then receives a new parent submission should show `Manual review needed / 需人工复核` instead of `Ready to schedule / 可直接排课`
  - student detail, ticket detail, and todo follow-up cards should agree on that manual-review phase
  - generated helper slots should search within the parent-submitted availability window first instead of only slicing a small teacher-slot list and filtering afterwards
  - suggested duration should prefer the coordination ticket's own `durationMin` when present, and only fall back to existing session samples or `45`
- Rollback point: previous production commit before `2026-04-12-r41`.

## 2026-04-11-r40

- Release ID: `2026-04-11-r40`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let one valid parent-availability link show all active coordination courses for the same student on one page, while keeping each course on its own ticket, submission, and matching lane.
- Key files:
  - `app/availability/[token]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-parent-availability-multi-course-same-page.md`
- Risk impact (if any): Medium. This release keeps the existing schema and one-ticket-per-course storage model, but it changes how coordination tickets are reused and displayed by making the student page and public parent form course-aware instead of always following only the first open coordination ticket.
- Verification:
  - `npm run build`
  - opening any valid `/availability/[token]` link for a student with multiple active coordination requests should show one card per course on the same page
  - each course card should submit independently without overwriting another course's payload
  - student detail should let ops switch helper focus between open coordination tickets and create a new coordination ticket only for courses that are not already being tracked
  - intake should reuse an open coordination ticket only when the incoming course matches the existing course lane; a different course should not be forced into the first open ticket
- Rollback point: previous production commit before `2026-04-11-r40`.

## 2026-04-11-r39

- Release ID: `2026-04-11-r39`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let the parent-availability calendar-date mode accept multiple time ranges on the same day, while keeping the original weekly template and data shape intact.
- Key files:
  - `app/availability/[token]/ParentAvailabilityFormFields.tsx`
  - `lib/parent-availability.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-parent-availability-multi-range-per-date.md`
- Risk impact (if any): Low to medium. This release only expands the exact-date parent-availability input so one selected day can carry multiple time ranges; it keeps the existing weekly template mode, database schema, scheduling slot matching model, quick scheduling, sessions, packages, deductions, and finance logic unchanged.
- Verification:
  - `npm run build`
  - `/availability/[token]` calendar-date mode should let families add up to three time ranges to one selected date
  - the submitted payload should continue using the existing flat `dateSelections[]` structure, with repeated dates allowed for multiple ranges
  - admin summaries should group one date's multiple time ranges into a readable combined line
- Rollback point: previous production commit before `2026-04-11-r39`.

## 2026-04-11-r38

- Release ID: `2026-04-11-r38`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: add a second parent-availability input mode so families can either fill a weekly repeating template or pick specific upcoming dates and times in a calendar-style view.
- Key files:
  - `app/availability/[token]/page.tsx`
  - `app/availability/[token]/ParentAvailabilityFormFields.tsx`
  - `lib/parent-availability.ts`
  - `lib/scheduling-coordination.ts`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-parent-availability-calendar-mode.md`
- Risk impact (if any): Medium. This release expands the parent-availability payload and matching rules to support specific date picks, but it keeps the existing weekly template mode intact and does not change teacher availability storage, quick scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - `/availability/[token]` should let families choose between weekly template mode and calendar-date mode
  - weekly submissions should continue storing and matching the current weekday plus time-range structure
  - calendar submissions should store specific date plus time selections and show them in ticket/student detail summaries
  - scheduling-coordination preview matching should respect the submitted mode without missing later exact-date selections
- Rollback point: previous production commit before `2026-04-11-r38`.

## 2026-04-11-r37

- Release ID: `2026-04-11-r37`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: restore a clear completion-note prompt in ticket-center status actions so operators are asked for the note before a ticket is marked completed, without bouncing the page to the top.
- Key files:
  - `app/admin/_components/TicketStatusSubmitButton.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-ticket-complete-note-prompt.md`
- Risk impact (if any): Low. This release only changes the completion-note prompt UX before status submission; it keeps the existing server-side completion-note requirement and does not change ticket rules, permissions, scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - choosing `Completed` without a note from ticket-center list should show a prompt before submission
  - choosing `Completed` without a note from ticket detail should show the same prompt before submission
  - cancelling or leaving the prompt empty should not submit the form or jump to the top of the page
- Rollback point: previous production commit before `2026-04-11-r37`.

## 2026-04-11-r36

- Release ID: `2026-04-11-r36`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: keep ticket-center operators in context by returning list actions to the current ticket area and detail actions to the section they just edited instead of bouncing the page back to the top.
- Key files:
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-ticket-center-scroll-position.md`
- Risk impact (if any): Low. This release only changes post-action return anchors in ticket-center surfaces; it does not change ticket permissions, status rules, archive/delete eligibility, intake behavior, scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - saving an open ticket status from `/admin/tickets` should return to the same ticket row instead of the top of the page
  - archiving or deleting a closed ticket from ticket-center lists should return to the ticket list section instead of the top summary area
  - saving status, editing fields, or using scheduling-coordination quick actions in ticket detail should return to the same section instead of the page top
- Rollback point: previous production commit before `2026-04-11-r36`.

## 2026-04-11-r35

- Release ID: `2026-04-11-r35`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let Zhao Hongwei permanently delete already-closed tickets from the ticket center while keeping the existing archive-first flow for everyone else.
- Key files:
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-ticket-center-zhao-hongwei-hard-delete.md`
- Risk impact (if any): Medium. This release adds an irreversible delete path for one strict super admin, but only for completed, cancelled, or archived tickets; it does not change open-ticket handling, status transitions, intake links, scheduling, sessions, packages, deductions, or finance flows.
- Verification:
  - `npm run build`
  - Zhao Hongwei should see `Delete permanently / 永久删除` on completed, cancelled, or archived tickets in ticket center surfaces
  - non-Zhao users should not see or be able to use the permanent delete path
  - open tickets should still reject permanent delete attempts
- Rollback point: previous production commit before `2026-04-11-r35`.

## 2026-04-11-r34

- Release ID: `2026-04-11-r34`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: keep scheduling-coordination ticket reuse consistent by making the intake success state clearly say when the current open coordination ticket was reused instead of implying a new one was created.
- Key files:
  - `app/tickets/intake/IntakeForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-ticket-reuse.md`
- Risk impact (if any): Low. This release only corrects reuse messaging in the coordination intake success state; it does not change how the active coordination ticket is selected, how parent links are generated, or any scheduling, session, package, deduction, or finance behavior.
- Verification:
  - `npm run build`
  - when intake reuses an existing open scheduling-coordination ticket, the success banner should clearly say the current ticket was reused
  - if that reused ticket still has an active parent-availability link, the green success card should say the current ticket was reused instead of saying a new ticket was created
  - new scheduling-coordination tickets should keep the existing "ticket created" success wording
- Rollback point: previous production commit before `2026-04-11-r34`.

## 2026-04-11-r33

- Release ID: `2026-04-11-r33`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let ops push scheduling-coordination progress directly from the student coordination page, while also writing clearer follow-up notes into the linked coordination ticket summary.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-student-action-sync.md`
- Risk impact (if any): Low. This release only adds clearer scheduling-coordination progress actions and summary updates; it does not change quick scheduling rules, teacher exception replies, sessions, packages, deductions, or finance flows.
- Verification:
  - `npx tsc --noEmit` passed
  - `npm run build` passed
  - ticket detail quick actions now update both status and coordination summary wording
  - student coordination helper cards now let ops mark options sent, mark alternatives sent, or move the item into teacher exception follow-up without leaving the student page
  - these student-page actions return to the same coordination section instead of dropping the operator out of context
- Rollback point: previous production commit before `2026-04-11-r33`.

## 2026-04-11-r32

- Release ID: `2026-04-11-r32`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: continue scheduling-coordination auto-progress so a parent availability submission now immediately re-evaluates current teacher availability and updates the linked coordination ticket to a more accurate ops follow-up state.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `app/availability/[token]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-auto-phase-advance.md`
- Risk impact (if any): Low to medium. This release only changes scheduling-coordination ticket follow-up updates after a parent availability submission; it does not change quick scheduling, teacher exception reply logic, sessions, packages, deductions, or finance flows.
- Verification:
  - `npx tsc --noEmit` passed
  - parent availability submission now checks current teacher-availability-backed slot matches before writing back to the linked coordination ticket
  - matching submissions now move the ticket into an ops-review state with "matching slots ready" guidance
  - no-match submissions now move the ticket into an ops-review state with "review alternatives first / ask teacher exception if needed" guidance
- Rollback point: previous production commit before `2026-04-11-r32`.

## 2026-04-11-r31

- Release ID: `2026-04-11-r31`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: simplify partner invoice line descriptions so they show only the student name in newly created online settlement invoices and in exported partner invoice PDFs.
- Key files:
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes partner invoice description text; it does not change receipt generation, invoice totals, settlement selection, approval rules, or deduction logic.
- Verification:
  - `npm run build` passed
  - newly created online partner invoices now store each settlement line description as the student name only
  - exported partner invoice PDFs now show only the student name even when older stored line descriptions still contain the legacy `Package settlement - student - course - dates` format
- Rollback point: previous production commit before `2026-04-11-r31`.

## 2026-04-11-r30

- Release ID: `2026-04-11-r30`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: force the narrow-screen receipt drawer backdrop to keep the same dark overlay color during hover, active, and focus states so the page no longer flashes the global purple link tint when finance clicks outside the drawer.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This hotfix only strengthens backdrop style overrides for the receipt drawer overlay; it does not change receipt approval behavior, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - narrow-screen receipt drawer backdrop keeps the same dark overlay during hover, click, and focus instead of flashing the global purple link/button tint
  - clicking outside the drawer still closes back to the current queue or history list state
- Rollback point: previous production commit before `2026-04-11-r30`.

## 2026-04-11-r29

- Release ID: `2026-04-11-r29`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: neutralize the narrow-screen receipt detail backdrop so clicking or hovering outside the drawer no longer shows the global purple link/button tint.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This hotfix only resets inherited link styles on the receipt drawer backdrop; it does not change receipt approval behavior, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - narrow-screen receipt drawer backdrop no longer shows the inherited purple button/link styling when finance clicks or hovers outside the drawer
  - the drawer still closes back to the current list state when finance clicks outside it
- Rollback point: previous production commit before `2026-04-11-r29`.

## 2026-04-10-r28

- Release ID: `2026-04-10-r28`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make selected receipt details easier to identify by surfacing receipt amount and invoice total near the top of the approval detail panel.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only adds amount summary display inside receipt details; it does not change receipt approval rules, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - selected receipt details now show `Receipt amount / 收据金额` and `Invoice total / 发票总额` near the top
  - the detail summary should clearly indicate whether the receipt amount matches the invoice total
- Rollback point: previous production commit before `2026-04-10-r28`.

## 2026-04-10-r27

- Release ID: `2026-04-10-r27`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: tighten the narrow-screen receipt detail overlay so it opens only after an explicit row click and behaves like a contained drawer instead of covering nearly the full screen.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This hotfix only adjusts when the narrow-screen receipt overlay appears and how large it is; it does not change receipt approval rules, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - narrow receipt queue/history screens do not show the overlay until finance explicitly opens a receipt row
  - the narrow-screen overlay now renders as a smaller right-side drawer with visible page margins instead of occupying almost the whole screen
  - wide screens keep the existing two-column queue-plus-detail layout
- Rollback point: previous production commit before `2026-04-10-r27`.

## 2026-04-10-r26

- Release ID: `2026-04-10-r26`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: keep receipt queue and receipt history usable on narrower screens by turning the selected receipt detail panel into a dismissible overlay instead of a long stacked second column.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes narrow-screen presentation for receipt details; it does not change receipt approval rules, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - on narrow screens, selecting a receipt from `Receipt Queue / 收据审批队列` or `Receipt History / 收据历史` now opens the detail panel as an overlay instead of stacking it below the queue
  - the overlay includes a direct `Back to list / 返回列表` action and tapping outside it closes back to the current filtered list
  - on wide screens, the existing two-column queue-plus-detail layout remains unchanged
- Rollback point: previous production commit before `2026-04-10-r26`.

## 2026-04-10-r25

- Release ID: `2026-04-10-r25`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance student-package invoice page remember recently used packages so repeated invoice work does not require a fresh search every time.
- Key files:
  - `app/admin/finance/student-package-invoices/_components/PackageSelectAutoSubmit.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only adds local recent-package shortcuts on the finance invoice page; it does not change invoice issuance, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - `/admin/finance/student-package-invoices` now remembers recent package selections in the browser and shows quick reopen chips
  - selecting a recent package chip updates the picker without auto-submitting the form
  - finance still must click `Load package summary / 加载课包摘要` before invoice totals and preview refresh
- Rollback point: previous production commit before `2026-04-10-r25`.

## 2026-04-10-r17

- Release ID: `2026-04-10-r17`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance receipt queue easier to move through and make receipt history easier to narrow without changing any billing or approval rules.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only adds navigation and filtering helpers on the finance receipt screens; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - `Next best item / 下一条最该处理` should show a direct `Open next item / 打开下一条` action
  - `/admin/receipts-approvals/history` should support `All history / 全部历史`, `Receipts only / 只看收据`, and `Actions only / 只看动作`
  - `/admin/receipts-approvals/history` should let finance narrow `Recent Finance Actions / 最近财务动作` by action type
- Rollback point: previous production commit before `2026-04-10-r17`.

## 2026-04-10-r16

- Release ID: `2026-04-10-r16`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: keep the finance receipt workspace from auto-jumping back to the top when switching the top receipt mode tabs.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes scroll behavior for the top receipt mode tabs; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - top receipt mode tabs should keep using client navigation without a full page reload
  - left finance sidebar should keep its current scroll position when switching between `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History`
  - main finance receipt content should keep its current page scroll position instead of jumping back to the top on each top-tab switch
  - finance sidebar should keep `Receipt Queue / 收据审批队列` highlighted when the queue is reopened from top workflow tabs or finance dashboard links
- Rollback point: previous production commit before `2026-04-10-r16`.

## 2026-04-10-r15

- Release ID: `2026-04-10-r15`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: stop the finance receipt top mode tabs from doing full page reloads so the left sidebar scroll state stays put while switching between finance receipt sub-pages.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes navigation behavior for the top receipt mode tabs; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - top receipt mode tabs should switch screens through client navigation instead of full page reload
  - left finance sidebar should keep its current scroll position when switching between `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History`
- Rollback point: previous production commit before `2026-04-10-r15`.

## 2026-04-10-r14

- Release ID: `2026-04-10-r14`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: make finance history lookup and proof repair triage more direct without changing any receipt or billing rules.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only improves receipt-history search and repair-page grouping; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - `Receipt History / 收据历史` should support searching completed receipts and recent finance actions by student, course, receipt no., invoice no., or uploader
  - `Proof Repair / 凭证修复` should show separate quick-triage groups for `Missing payment record / 缺付款记录` and `Missing file on linked proof / 已关联但缺文件`
- Rollback point: previous production commit before `2026-04-10-r14`.

## 2026-04-10-r13

- Release ID: `2026-04-10-r13`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: make the split finance receipt flows easier to operate by surfacing the next best queue item and turning the package workspace into a clearer step-by-step handoff.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only improves finance guidance and flow framing; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - receipt queue screens should show a `Next best item / 下一条最该处理` card above the queue controls whenever there is an actionable row
  - the card should explain whether the next item is blocked by missing proof, missing file, prior rejection, or only needs a quick amount/detail check
  - package workspace should show `Step 1 Upload`, `Step 2 Check Records`, and `Step 3 Create Receipt` cards with clear done/current/next states
- Rollback point: previous production commit before `2026-04-10-r13`.

## 2026-04-10-r12

- Release ID: `2026-04-10-r12`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: clarify teacher-side and admin-side availability wording so everyone can clearly see that date slots are the real schedulable source and weekly templates are only generation helpers.
- Key files:
  - `app/teacher/availability/page.tsx`
  - `app/teacher/availability/TeacherAvailabilityClient.tsx`
  - `app/admin/teachers/[id]/availability/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-availability-wording-clarity.md`
- Risk impact (if any): Low. This release changes wording only; it does not change scheduling behavior, availability storage, finance logic, or permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher availability page should explain that date slots saved there are the real schedulable source
  - admin teacher availability page should explain that weekly templates only generate month date slots
- Rollback point: previous production commit before `2026-04-10-r12`.

## 2026-04-09-r11

- Release ID: `2026-04-09-r11`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: stop all real scheduling flows from falling back to weekly availability templates so only date-based availability can authorize scheduling, rescheduling, teacher replacement, appointment creation, and booking candidate generation.
- Key files:
  - `lib/teacher-scheduling-availability.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/schedule/page.tsx`
  - `app/admin/classes/[id]/sessions/page.tsx`
  - `app/admin/teachers/[id]/availability/AdminTeacherAvailabilityClient.tsx`
  - `app/admin/teachers/[id]/availability/page.tsx`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/classes/[id]/sessions/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/classes/[id]/sessions/replace-teacher/route.ts`
  - `app/api/admin/students/[id]/sessions/replace-teacher/route.ts`
  - `app/api/admin/sessions/[id]/replace-teacher/route.ts`
  - `app/api/admin/appointments/route.ts`
  - `app/api/admin/appointments/[id]/replace-teacher/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/api/admin/booking-links/candidates/route.ts`
  - `lib/booking.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-date-only-scheduling-availability.md`
- Risk impact (if any): Medium-low. This release intentionally tightens scheduling eligibility across multiple admin entry points and booking candidate generation; weekly templates still exist, but only as a helper to generate month date slots.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin teacher availability page should explain that only date slots are used for real scheduling
  - quick schedule should reject dates that have no date availability even if the teacher has a matching weekly template
  - booking candidate generation should only consider date availability rows inside the requested range
- Rollback point: previous production commit before `2026-04-09-r11`.

## 2026-04-09-r10

- Release ID: `2026-04-09-r10`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: clarify teacher availability inheritance so monthly availability cells no longer look unavailable when scheduling is still correctly falling back to the teacher's weekly template.
- Key files:
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/teachers/[id]/availability/AdminTeacherAvailabilityClient.tsx`
  - `app/admin/teachers/[id]/availability/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-availability-weekly-fallback-clarity.md`
- Risk impact (if any): Low. This release does not change the actual scheduling eligibility rules; it only makes the existing date-vs-weekly availability source much clearer in admin UI so ops do not mistake inherited weekly availability for forced scheduling.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin teacher availability month cells with no date override but matching weekly template should show `仍按每周模板可排`
  - quick schedule candidate status should show whether a teacher is available via `按每周模板可排` or `按日期时段可排`
- Rollback point: previous production commit before `2026-04-09-r10`.

## 2026-04-09-r08

- Release ID: `2026-04-09-r08`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: make the scheduling coordination console more actionable by showing availability-backed results directly against the latest parent submission, including matching slots when the family's submitted times already fit current teacher availability and nearest alternatives when they do not.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-availability-match-console.md`
- Risk impact (if any): Low. This release only enriches the scheduling-coordination operator console and candidate-slot filtering against parent-submitted availability; it does not change ticket tokens, quick schedule execution, session creation, attendance, packages, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin ticket detail for a submitted scheduling coordination item should show `availability 命中结果 / Availability-backed result`
  - if parent-submitted times already fit teacher availability, ticket detail should show matching slot cards with `Copy Message`
  - if there are no matches, ticket detail should show nearest alternative slot cards with `Copy Alternative`
  - student detail scheduling coordination card should continue to show only slots that fit the submitted parent availability
- Rollback point: previous production commit before `2026-04-09-r08`.

## 2026-04-09-r09

- Release ID: `2026-04-09-r09`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: make scheduling coordination feel more like a true operator state flow by adding a derived coordination phase, clearer next-step guidance, and one-click ticket progression for “options sent” and “teacher exception needed”.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-phase-flow-and-quick-progress-actions.md`
- Risk impact (if any): Low. This release only improves scheduling-coordination operator guidance, derived phase display, and ticket quick actions; it does not change tokens, parent form storage, quick schedule execution, session creation, attendance, package logic, or finance behavior.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = dea110a`
  - `https://sgtmanage.com/admin/login` returned `200`
  - live admin `/admin/tickets/[id]` for `赵测试` coordination item showed the new `Coordination phase / 协调阶段` summary
  - matching availability results exposed `Mark options sent / 标记已发候选时间`
  - live student detail scheduling coordination card for `赵测试` showed the new coordination controls and summary actions
  - `Todo Center` phase text was not re-verified against a live due item during this release because no current coordination reminder row was available to click in production
- Rollback point: previous production commit before `2026-04-09-r09`.

## 2026-04-09-r07

- Release ID: `2026-04-09-r07`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: turn scheduling coordination into a more usable operator console by adding parent-form link controls, structured latest-submission summaries, and direct parent-message copy actions from both the ticket detail page and the student detail coordination card.
- Key files:
  - `app/admin/_components/CopyTextButton.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `lib/parent-availability.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-console-and-parent-message-actions.md`
- Risk impact (if any): Low. This release only improves scheduling-coordination presentation, copy/share actions, and parent-link regeneration around existing ticket/token flows; it does not change session creation, quick schedule core logic, attendance, package balances, or finance behavior.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin ticket detail should show a richer `Scheduling Coordination Console` with copy-link, copy-message, regenerate-link, and latest-parent-submission summary
  - student detail scheduling coordination card should show the same parent-link actions and structured latest parent submission details
  - suggested slot cards should expose `Copy Message` actions so ops can send suggested times to parents without rewriting them
- Rollback point: previous production commit before `2026-04-09-r07`.

## 2026-04-09-r06

- Release ID: `2026-04-09-r06`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: polish the external coordination touchpoints so Emily gets a clearer parent-link handoff panel after ticket submit and families see a simpler, more mobile-friendly availability form that explains the process more clearly.
- Key files:
  - `app/tickets/intake/IntakeForm.tsx`
  - `app/availability/[token]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-parent-availability-touchpoint-polish.md`
- Risk impact (if any): Low. This release only changes the intake success UI and the public parent-availability form presentation; it does not change token generation, ticket creation, parent submission storage, scheduling logic, or finance flows.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - Emily intake success state should show clearer copy/share guidance after creating a scheduling coordination ticket
  - parent `/availability/[token]` should load the new guidance blocks and the friendlier input layout
- Rollback point: previous production commit before `2026-04-09-r06`.

## 2026-04-09-r05

- Release ID: `2026-04-09-r05`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: fix the Emily intake success payload so generated parent availability links use the real production origin instead of an internal `localhost` host when running behind the server proxy.
- Key files:
  - `app/api/tickets/intake/[token]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This release only fixes the absolute origin used for the returned parent form link; it does not change ticket creation, parent form storage, scheduling logic, or finance flows.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - creating a scheduling coordination ticket through the external intake link should now return a parent link under `https://sgtmanage.com/availability/...`
  - real `赵测试` intake QA should confirm the returned `parentAvailabilityUrl` no longer uses `localhost`
- Rollback point: previous production commit before `2026-04-09-r05`.

## 2026-04-09-r04

- Release ID: `2026-04-09-r04`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: let external intake operators create `Scheduling Coordination / 排课协调` tickets and immediately get a temporary parent availability link so families can submit lesson-time preferences without logging into the back office.
- Key files:
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/tickets/intake/IntakeForm.tsx`
  - `app/tickets/intake/[token]/page.tsx`
  - `app/availability/[token]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `lib/parent-availability.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260409181306_add_parent_availability_requests/migration.sql`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-parent-availability-link-for-intake-scheduling-coordination.md`
- Risk impact (if any): Low to medium. This release adds a new lightweight link-token table and new public form route, but it does not change session creation, quick schedule core logic, attendance, package math, or finance flows.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - Emily-style ticket intake should allow `Scheduling Coordination / 排课协调` with a confirmed student and show a copyable parent availability link after submit
  - parent `/availability/[token]` should accept structured weekday/time submissions and show a success state without implying the lesson is already scheduled
  - submitted parent availability should appear on the linked admin ticket, student detail scheduling card, and `Todo Center`
- Rollback point: previous production commit before `2026-04-09-r04`.

## 2026-04-08-r07

- Release ID: `2026-04-08-r07`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: change online partner settlement from package-snapshot batching to purchase-batch settlement so each `PURCHASE` tranche can be billed independently, reverted back into queue, and exported with clear start/end dates.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `lib/partner-settlement.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260408170000_partner_settlement_purchase_batches/migration.sql`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-partner-settlement-online-purchase-batch-pass.md`
- Risk impact (if any): Medium. This release changes online partner-settlement data shape and billing workflow, but only for `ONLINE_PACKAGE_END`; offline monthly settlement remains unchanged.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin `/admin/reports/partner-settlement` should show online rows by purchase batch, each with purchase date, start date, and end date
  - admin `/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END...` should invoice only the selected settlement items instead of bundling all pending online rows
  - reverting an online settlement should return that tranche to the queue instead of deleting it
  - partner invoice export should show `Course Start / Course End` when the selected online settlement items provide a date window
- Rollback point: previous production commit before `2026-04-08-r07`.

## 2026-04-08-r06

- Release ID: `2026-04-08-r06`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: replace the teacher-lead month board with a weekly calendar board and expand each day's sessions directly inside the day cell.
- Key files:
  - `app/teacher/lead/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-teacher-lead-week-calendar-expanded-days.md`
- Risk impact (if any): Low. This release only changes the teacher-lead schedule presentation; it does not change ACL rules, filter semantics, schedule data, finance logic, or admin permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/lead` should show a one-week calendar with each day expanded directly
- Rollback point: previous production commit before `2026-04-08-r06`.

## 2026-04-08-r05

- Release ID: `2026-04-08-r05`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: replace the teacher-column lead board with a month-calendar primary view so teacher leads can scan the whole month and then inspect the selected day below.
- Key files:
  - `app/teacher/lead/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-teacher-lead-month-calendar-board.md`
- Risk impact (if any): Low. This release only changes the teacher-lead schedule presentation; it does not change ACL rules, filter semantics, schedule data, finance logic, or admin permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/lead` should show a month calendar as the main board and a selected-day details section below
- Rollback point: previous production commit before `2026-04-08-r05`.

## 2026-04-08-r03

- Release ID: `2026-04-08-r03`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: make the new `Teacher Lead / 老师主管` page more visual by turning the all-teachers daily schedule into a calendar-like hourly day board while keeping the detailed table as a secondary expandable section.
- Key files:
  - `app/teacher/lead/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-teacher-lead-visual-day-board.md`
- Risk impact (if any): Low. This release only changes teacher-lead page presentation; it does not change ACL rules, filters, schedule data, finance logic, or any admin permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/lead` should show `Visual day board / 日历板视图` with hourly schedule cards and an expandable detailed table below
- Rollback point: previous production commit before `2026-04-08-r03`.

## 2026-04-08-r02

- Release ID: `2026-04-08-r02`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: add the first `Teacher Lead / 老师主管` role pass as an additive teacher-side ACL so selected teachers can open a lead desk and review the all-teachers daily schedule without gaining admin-finance or system-control access.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260408093000_add_teacher_lead_acl/migration.sql`
  - `lib/auth.ts`
  - `app/api/admin/manager/teacher-leads/route.ts`
  - `app/api/admin/manager/teacher-leads/[id]/route.ts`
  - `app/admin/manager/users/page.tsx`
  - `app/admin/manager/users/_components/TeacherLeadEmailAddClient.tsx`
  - `app/admin/manager/users/_components/TeacherLeadEmailRemoveClient.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/lead/page.tsx`
  - `docs/tasks/TASK-20260408-teacher-lead-v1.md`
- Risk impact (if any): Low to medium. This release adds a new ACL table and a new teacher-side route, but keeps permissions narrow: teacher leads can only see the new lead desk and do not inherit admin finance, setup, or user-management privileges.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - owner-manager edit mode should show `Teacher Lead Access List / 老师主管名单维护`
  - teacher accounts on that ACL should see `Lead Desk / 主管工作台` and reach `/teacher/lead`
- Rollback point: previous production commit before `2026-04-08-r02`.

## 2026-04-08-r01

- Release ID: `2026-04-08-r01`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: align the teacher-side final-report writing form with the parent-facing PDF so teachers write in the same narrative order and wording families will later read.
- Key files:
  - `app/teacher/final-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-final-report-teacher-form-parent-pdf-alignment-pass.md`
- Risk impact (if any): Low. This release only changes teacher-side field labels, order, and explanatory copy; it does not change report storage, submission rules, PDF data sources, delivery/share logic, or any finance/attendance/package behavior.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/final-reports/[id]` should show the parent-facing note and the softer family-facing section titles
- Rollback point: previous production commit before `2026-04-08-r01`.

## 2026-04-07-r09

- Release ID: `2026-04-07-r09`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: tighten the parent-facing `Final Report` PDF rules so draft reports no longer appear as formal family handoffs and empty final-level placeholders no longer print into the PDF.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-submission-gate-and-empty-level-pass.md`
- Risk impact (if any): Low. This release only changes PDF availability and empty-state rendering for final reports; it does not change teacher drafting, report data storage, delivery/share flows, or any finance/attendance/package logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin final-report rows should show `Download PDF` only for `SUBMITTED` or `FORWARDED` reports
  - reports without `Final level / 最终水平` should no longer print the `Added by teacher / 由老师填写` placeholder in the PDF
- Rollback point: previous production commit before `2026-04-07-r09`.

## 2026-04-06-r12

- Release ID: `2026-04-06-r12`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: tune only the admin sidebar group colors so `Today / Core Workflows / Finance & Review / Setup & Control / Reports` are easier to distinguish while keeping the sidebar simple.
- Key files:
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-admin-sidebar-color-tuning-pass.md`
- Risk impact (if any): Low. This release only adjusts sidebar color tokens; it does not change routes, permissions, queue logic, or any business workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar groups should remain simple while `Core Workflows` reads more clearly via color separation alone
- Rollback point: previous production commit before `2026-04-06-r12`.

## 2026-04-06-r11

- Release ID: `2026-04-06-r11`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: simplify the `Core Workflows / 核心流程` sidebar pass by removing the extra item-level copy while keeping the stronger group color distinction and simpler section summary.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-admin-core-workflows-simplify-followup.md`
- Risk impact (if any): Low. This release only trims sidebar copy and emphasis styling; it does not change routes, permissions, queue logic, or any student/finance/teaching workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should keep the stronger group colors while `Core Workflows / 核心流程` returns to a simpler label-first list
- Rollback point: previous production commit before `2026-04-06-r11`.

## 2026-04-06-r10

- Release ID: `2026-04-06-r10`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: make `Core Workflows / 核心流程` read more clearly as the main operator zone by adding task-oriented descriptions, stronger primary-item emphasis, and a more distinct group style.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-admin-core-workflows-clarity-pass.md`
- Risk impact (if any): Low. This release only changes admin sidebar copy, emphasis, and grouping presentation; it does not change routes, permissions, queue logic, or any business workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should show clearer descriptions and stronger emphasis for `Students / Enrollments / Packages / Ticket Center` under `Core Workflows / 核心流程`
- Rollback point: previous production commit before `2026-04-06-r10`.

## 2026-04-04-r09

- Release ID: `2026-04-04-r09`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: regroup `SOP One Pager / SOP一页纸` into `Core Workflows / 核心流程`, move `Undeducted Completed / 已完成未减扣` into `Reports / 报表`, and strengthen admin sidebar group hierarchy so each section is easier to scan.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-admin-sidebar-regroup-and-visual-pass.md`
- Risk impact (if any): Low. This release only changes admin sidebar grouping and visual emphasis; it does not change permissions, routes, queue logic, reporting calculations, or any business workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should show `SOP One Pager / SOP一页纸` under `Core Workflows / 核心流程`
  - admin sidebar should show `Undeducted Completed / 已完成未减扣` under `Reports / 报表`
- Rollback point: previous production commit before `2026-04-04-r09`.

## 2026-04-04-r08

- Release ID: `2026-04-04-r08`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: move `Monthly Schedule / 月课表总览` from the admin `Reports` sidebar group into `Today / 今天` so operators can reach the month schedule from the day-first workspace cluster.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-admin-nav-monthly-schedule-to-today.md`
- Risk impact (if any): Low. This release only changes admin sidebar grouping and link placement; it does not change schedule data, report logic, permissions, or any finance/teaching workflows.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should show `Monthly Schedule / 月课表总览` under `Today / 今天`, no longer under `Reports / 报表`
- Rollback point: previous production commit before `2026-04-04-r08`.

## 2026-04-04-r07

- Release ID: `2026-04-04-r07`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: fix the packages workbench "Back to default workbench" shortcuts so they actually clear remembered filters instead of reloading the same remembered package state.
- Key files:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-packages-default-workbench-clearfix.md`
- Risk impact (if any): Low. This release only changes package workbench reset links to use the explicit remembered-filter clear path; it does not change package filtering rules, billing, ledger, top-up, or package edit/delete logic.
- Verification:
  - `npm run build` passed
  - targeted QA reproduced the bug on production: `/admin/packages` resumed remembered `paid=unpaid`, and the banner shortcut still pointed to bare `/admin/packages`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = a4568df`
  - `https://sgtmanage.com/admin/login` returned `200`
  - post-deploy QA confirmed `Back to default workbench` now lands on `?clearFilters=1`, hides the resumed-filters banner, and resets `Payment / 付款` from remembered `unpaid` back to `All / 全部`
- Rollback point: previous production commit before `2026-04-04-r07`.

## 2026-04-04-r06

- Release ID: `2026-04-04-r06`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: hotfix the remaining student-detail `edit-student` id collision so explicit edit focus returns target the real edit details block.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-edit-id-collision-hotfix.md`
- Risk impact (if any): Low. This release only removes an id collision in the student-detail edit section; it does not change student save/delete behavior or any scheduling, attendance, package, billing, or reporting logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 5967863`
  - `https://sgtmanage.com/admin/login` returned `200`
  - targeted live QA confirmed `focus=edit-student#edit-student` now hits a single `DETAILS` target and leaves it open (`editCount = 1`, `editOpen = true`)
- Rollback point: previous production commit before `2026-04-04-r06`.

## 2026-04-04-r05

- Release ID: `2026-04-04-r05`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: hotfix the remaining student-detail explicit-focus gap so `Edit Student / 编辑学生` stays open when operators return with `focus=edit-student`.
- Key files:
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-edit-open-hotfix.md`
- Risk impact (if any): Low. This release only stabilizes the client-side open state for the edit-student details block; it does not change student save/delete behavior or any scheduling, attendance, package, billing, or reporting logic.
- Verification:
  - `npm run build` passed
  - `npm run build` passed
  - post-deploy startup check confirmed `local / origin / server = 9c86c41`
  - `https://sgtmanage.com/admin/login` returned `200`
  - follow-up QA found a remaining DOM id collision on `edit-student`, so `r05` should be treated as a partial hotfix only
- Rollback point: previous production commit before `2026-04-04-r05` (`ea9779d`).

## 2026-04-04-r04

- Release ID: `2026-04-04-r04`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: refine student-detail first-render section state so explicit focus returns open packages, enrollments, quick schedule, and edit flows in the right work area without waiting for client-side recovery.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-focus-open-pass.md`
- Risk impact (if any): Low. This release only improves student-detail first-render section state and return targeting; it does not change scheduling, attendance, package, billing, or student data rules.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed `local / origin / server = 64040e5`
  - `https://sgtmanage.com/admin/login` returned `200`
  - operator click-through should confirm explicit `focus` returns open `Packages / Enrollments / Quick Schedule / Edit Student` on first render
- Rollback point: previous production commit before `2026-04-04-r04` (`28a62bd`).

## 2026-04-04-r03

- Release ID: `2026-04-04-r03`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: reopen the correct student-detail workbench section from hash-driven returns so packages, attendance, and edit flows stay usable after refreshes and same-page redirects.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/studentDetailHash.ts`
  - `app/admin/students/[id]/_components/StudentDetailHashStateClient.tsx`
  - `app/admin/_components/StudentAttendanceFilterForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-section-open-state-pass.md`
- Risk impact (if any): Low. This release only improves student-detail section reopening and hash return behavior; it does not change scheduling, attendance, package, billing, or student data rules.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = b3ce26b`
  - `https://sgtmanage.com/admin/login` returned `200`
  - the shared student-detail hash restore layer now reopens matching `<details>` blocks for hash-driven returns; targeted operator click-through should confirm `Packages / Attendance / Edit Student` stay reopened in live use
- Rollback point: previous production commit before `2026-04-04-r03`.

## 2026-04-04-r02

- Release ID: `2026-04-04-r02`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: keep the student-detail calendar section expanded when switching months so the planning workbench stays open after `Prev Month / Next Month`.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-calendar-open-hotfix.md`
- Risk impact (if any): Low. This release only preserves calendar view state on the student-detail page; it does not change quick scheduling, attendance, deduction, package, or billing logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 29b623a`
  - production `https://sgtmanage.com/admin/login` returned `200`
  - the hotfix now carries `calendarOpen=1` on student-detail month navigation so server render keeps `Planning tools & calendar` expanded across month switches; browser click-through should be confirmed in the next operator pass
- Rollback point: previous production commit before `2026-04-04-r02`.

## 2026-04-04-r01

- Release ID: `2026-04-04-r01`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: keep the admin student detail page anchored to the current section after same-page actions and refreshes so operations do not get dropped back at the top of the workbench.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/studentDetailHash.ts`
  - `app/admin/students/[id]/_components/SessionCancelRestoreClient.tsx`
  - `app/admin/students/[id]/_components/SessionReplaceTeacherClient.tsx`
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `app/admin/_components/StudentAttendanceFilterForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-section-return-fix.md`
- Risk impact (if any): Low. This release only changes student-detail navigation and same-page section return behavior; it does not change student data, scheduling, attendance, deduction, package, or billing business logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 14d5980` and `https://sgtmanage.com/admin/login` returned `200`
  - post-deploy `curl -I https://sgtmanage.com/admin/login` returned `200`
  - targeted student-detail validation confirmed the fix covers calendar navigation, quick-schedule links, attendance filter routing, and same-page refresh helpers for edit / cancel / replace-teacher flows
- Rollback point: previous production commit before `2026-04-04-r01`.

## 2026-04-03-r27

- Release ID: `2026-04-03-r27`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an `Archive / 归档` layer to Midterm Reports and Final Reports so completed or exempt report records can leave the active desks without losing audit history.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260404004000_add_report_archive_metadata/migration.sql`
  - `lib/final-report.ts`
  - `lib/midterm-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/admin/reports/midterm/page.tsx`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-report-archive-phase-1.md`
- Risk impact (if any): Medium-low. This ship adds report archive metadata and new admin-only archive/restore transitions, but it does not change report submission content, parent delivery/share logic, finance flows, attendance/package math, or existing exempt semantics.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm admin `Final Report Center` and `Midterm Report Center` show `Archived`, and teacher report lists continue hiding archived items
- Rollback point: previous production commit before `2026-04-03-r27`.

## 2026-04-03-r26

- Release ID: `2026-04-03-r26`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an `EXEMPT / 无需报告` path to Midterm Reports so operations can remove no-report midpoint tasks from both the admin and teacher queues without assigning or keeping teacher work open.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260404000500_add_midterm_report_exempt_status/migration.sql`
  - `lib/midterm-report.ts`
  - `app/admin/reports/midterm/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-midterm-report-exempt-phase-1.md`
- Risk impact (if any): Medium-low. This ship adds a Prisma enum/schema migration and new admin-only status transitions on Midterm Reports, but it does not change final reports, package progress math, attendance, finance flows, teacher submission rules for non-exempt reports, or existing forwarded-lock behavior.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm admins can see `Exempt` in `/admin/reports/midterm`, candidate rows expose `Mark exempt`, and teacher `/teacher/midterm-reports` excludes exempt items
- Rollback point: previous production commit before `2026-04-03-r26`.

## 2026-04-03-r25

- Release ID: `2026-04-03-r25`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an `EXEMPT / 无需报告` path to Final Reports so operations can remove no-report packages from the final-report queue without pushing work to teachers first.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403235500_add_final_report_exempt_status/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-exempt-phase-1.md`
- Risk impact (if any): Medium-low. This ship adds a Prisma enum/schema migration and new admin-only status transitions on Final Reports, but it does not change midterm reports, package completion math, attendance, finance flows, or teacher submission rules for non-exempt reports.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm admins can see `Exempt` in `/admin/reports/final`, candidate rows expose `Mark exempt`, and exempted reports disappear from `/teacher/final-reports`
- Rollback point: previous production commit before `2026-04-03-r25`.

## 2026-04-03-r18

- Release ID: `2026-04-03-r18`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: fix the admin packages workbench so explicitly clearing payment/course/search filters no longer gets overridden by remembered filters, and the `Clear` action truly resets the desk.
- Key files:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-packages-filter-clear-fix.md`
- Risk impact (if any): Low. This ship only fixes filter-state parsing on the packages workbench; package creation, editing, top-up, billing, ledger, remembered-flow cards, and package business logic remain unchanged.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm `paid=unpaid -> all` can return to `All Payment Status` and `clearFilters=1` no longer shows resumed remembered filters
- Rollback point: previous production commit before `2026-04-03-r18`.

## 2026-04-03-r17

- Release ID: `2026-04-03-r17`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: move the student package month-end balance report off the invoice workbench into its own finance page so reporting and invoice issuance stay separate.
- Key files:
  - `app/admin/finance/student-package-balances/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-balance-report-separate-page.md`
- Risk impact (if any): Low. This ship only moves the existing read-only month-end balance report UI into its own finance route and adds navigation links; report math, CSV export behavior, package ledger basis logic, invoice issuance, receipts, approvals, and finance permissions remain unchanged.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm `/admin/finance/student-package-balances` renders the report and `/admin/finance/student-package-invoices` now shows only the jump card
- Rollback point: previous production commit before `2026-04-03-r17`.

## 2026-04-03-r16

- Release ID: `2026-04-03-r16`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: make the month-end balance report’s amount-basis source easier to scan by turning the source labels into color-coded badges and adding a small on-page legend.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-badges.md`
- Risk impact (if any): Low. This is a student-billing presentation-only pass; the report calculation, export route, package ledger writes, billing flow, and finance approval behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
- Rollback point: previous production commit before `2026-04-03-r16`.

## 2026-04-03-r15

- Release ID: `2026-04-03-r15`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: upgrade the student-billing month-end balance report to use purchase-ledger amount history when available, while keeping safe fallbacks for older packages without amount deltas.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403173000_add_package_txn_delta_amount/migration.sql`
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/packages/[id]/route.ts`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `app/admin/packages/[id]/ledger/PackageLedgerEditTxnClient.tsx`
  - `lib/student-package-month-end-balance.ts`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-ledger-basis.md`
- Risk impact (if any): Medium. This ship includes a Prisma schema migration plus `PURCHASE` write-path updates for packages and top-ups, but it does not change deduction behavior, package remaining-minute math, billing approvals, or finance workflow rules. Old packages still fall back safely when purchase amount history is incomplete.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
- Rollback point: previous production commit before `2026-04-03-r15`.

## 2026-04-03-r14

- Release ID: `2026-04-03-r14`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an inline preview table and summary cards to the new student-billing month-end balance report so finance can inspect the report before exporting CSV.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-preview.md`
- Risk impact (if any): Low. This ship only adds a read-only preview on the same month-end balance basis already used by the export; package deductions, receipts, invoices, approvals, and the CSV calculation path remain unchanged.
- Verification:
  - `npm run build` passed
  - page-level verification confirmed the month-end report block now renders summary cards plus the first 12 rows inline while keeping the same export link
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-03-r14`.

## 2026-04-03-r13

- Release ID: `2026-04-03-r13`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add a read-only month-end balance export under student billing so finance can export remaining package balance in hours and estimated amount as of a selected month end.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `lib/student-package-month-end-balance.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-report.md`
- Risk impact (if any): Low to medium. This ship is read-only and does not change any package, billing, receipt, or approval logic, but version 1 amount is a management estimate based on receipt totals up to month end or fallback package paid amount, not an audit-grade historical price ledger.
- Verification:
  - `npm run build` passed
  - local logged-in QA on `http://127.0.0.1:3322/admin/finance/student-package-invoices?balanceMonth=2026-03` confirmed the new month-end report block renders in student billing
  - local export QA on `http://127.0.0.1:3322/api/exports/student-package-month-end-balance?month=2026-03` returned `200` and generated CSV headers plus package rows
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-03-r13`.

## 2026-04-03-r11

- Release ID: `2026-04-03-r11`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: continue the teacher-side UI clarity pass on the teacher card, midterm reports, and payroll desk so not-linked/empty states and primary actions read consistently across the portal.
- Key files:
  - `app/teacher/card/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-card-midterm-payroll-clarity-pass.md`
- Risk impact (if any): Low. This ship only changes empty-state presentation, action emphasis, and next-step guidance on four existing teacher pages; no teacher intro save logic, card export logic, report save/submit behavior, report locking rules, payroll calculations, payroll confirmation rules, or payout workflow changed.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the new teacher-card guidance, midterm empty-state/action hierarchy, and payroll clear/error-state improvements on the same routes
- Rollback point: previous production commit before `2026-04-03-r11`.

## 2026-04-03-r10

- Release ID: `2026-04-03-r10`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: continue the teacher-side UI clarity pass on expense claims and sign-in alerts so empty states explain the next step and the main action is easier to spot.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/alerts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-expense-and-alerts-clarity-pass.md`
- Risk impact (if any): Low. This ship only changes button emphasis, empty-state guidance, and next-step navigation on two existing teacher workbench pages; no expense submit/resubmit/withdraw rules, attachment logic, alert sync, quick-mark behavior, attendance handling, or feedback-overdue detection changed.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the new expense empty-state/filter hierarchy and the new alerts empty-state/action hierarchy on the same routes
- Rollback point: previous production commit before `2026-04-03-r10`.

## 2026-04-03-r09

- Release ID: `2026-04-03-r09`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the next teacher-side clarity pass on the student feedback desk and ticket board so empty states explain the next step and primary actions stand out more clearly.
- Key files:
  - `app/teacher/student-feedbacks/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-feedbacks-and-tickets-clarity-pass.md`
- Risk impact (if any): Low. This ship only changes empty-state presentation, filter/button emphasis, and next-step guidance on two existing teacher workbench pages; no feedback timeline logic, unread-marking behavior, handoff-risk filters, ticket proof-file behavior, ticket completion rules, or ticket status transitions changed.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-03-r09`.

## 2026-04-03-r08

- Release ID: `2026-04-03-r08`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the next UI clarity pass on admin feedbacks, packages, and partner settlement so button hierarchy is easier to scan and empty states explain the next logical action.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/packages/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-button-hierarchy-and-empty-states-pass-2.md`
- Risk impact (if any): Low. This ship only changes button emphasis and empty-state guidance on three existing admin workbench pages; no feedback forwarding logic, proxy-draft behavior, package CRUD/top-up logic, settlement calculations, settlement creation rules, invoice history logic, or revert semantics changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3336` confirmed:
    - `/admin/feedbacks?status=pending&studentId=missing-student` renders the new empty-state guidance and the stronger filter apply/clear hierarchy
    - `/admin/packages?q=__nomatch__` renders the new filtered-empty-state guidance plus the stronger filter apply/clear hierarchy
    - `/admin/reports/partner-settlement?month=1999-01` renders the new empty-state guidance, and `/admin/reports/partner-settlement` still renders the stronger primary/danger action hierarchy
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the same new empty-state guidance and button hierarchy on the same three pages
- Rollback point: previous production commit before `2026-04-03-r08`.

## 2026-04-03-r07

- Release ID: `2026-04-03-r07`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Improve button hierarchy and empty-state guidance on teacher payroll, expense claims, and receipt approvals so users can tell the next safe action faster without changing any workflow logic.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-button-hierarchy-and-empty-states.md`
- Risk impact (if any): Low. This ship only changes button emphasis and empty-state guidance on three existing workbench pages; no payroll calculations, payroll confirmation rules, expense approval logic, receipt approval order, payout behavior, or attachment business rules changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3335` confirmed:
    - `/teacher/payroll?month=2099-01&scope=all` renders the new payroll-not-available empty state with direct dashboard and expense-claims links
    - `/admin/expense-claims?status=SUBMITTED&month=1999-01` renders the new empty-queue guidance and `/admin/expense-claims` still renders the updated primary/danger action hierarchy
    - `/admin/receipts-approvals?month=1999-01` renders the new empty-queue and no-selection guidance, and `/admin/receipts-approvals` still renders the updated primary/secondary/danger action hierarchy
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the same new empty-state guidance and button hierarchy on the same three pages
- Rollback point: previous production commit before `2026-04-03-r07`.

## 2026-04-03-r06

- Release ID: `2026-04-03-r06`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run a fourth admin copy-clarity pass on the teacher payroll desk, the student package invoice workbench, and the attachment health desk so finance-facing labels and guidance read more naturally without changing any workflow logic.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/recovery/uploads/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-4.md`
- Risk impact (if any): Low. This ship only rewrites visible copy on three existing admin workbench pages; no payroll calculations, payout permissions, invoice creation rules, attachment recovery behavior, or file-routing logic changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3334` confirmed:
    - `/admin/reports/teacher-payroll` renders the new workflow-state, explainer, and payout-group wording
    - `/admin/finance/student-package-invoices` renders the new workbench title, preview explanation, form labels, and invoice-table headings
    - `/admin/recovery/uploads` renders the new attachment-health hero, shortcut, restore, and table copy
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the same new copy on the same three pages
- Rollback point: previous production commit before `2026-04-03-r06`.

## 2026-04-03-r05

- Release ID: `2026-04-03-r05`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the third admin copy-clarity pass on the admin ticket center, finance workbench, and teacher payroll detail page so high-traffic bilingual labels read more naturally without changing any workflow logic.
- Key files:
  - `app/admin/tickets/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-3.md`
- Risk impact (if any): Low. This ship only rewrites UI copy and a redundant table header on three existing admin pages; no ticket workflow rules, finance workbench routing or reminder behavior, payroll math, completion rules, or approval logic changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3333` confirmed:
    - `/admin/tickets` renders the new management-focus, intake-link, queue, and completion-note wording
    - `/admin/finance/workbench` renders the new search/filter, reminder-preview, and reminder-detail wording
    - `/admin/reports/teacher-payroll/[teacherId]` renders the new back-link, scope, anomaly-filter, and payroll-period wording
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production:
    - `/admin/tickets` shows the new ticket-center wording on banners, intake links, and action fields
    - `/admin/finance/workbench` shows the new finance search/filter labels and reminder-detail wording
    - `/admin/reports/teacher-payroll/[teacherId]` shows the new payroll-detail scope/filter copy and the corrected combo-summary header row
- Rollback point: previous production commit before `2026-04-03-r05`.

## 2026-04-03-r04

- Release ID: `2026-04-03-r04`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the second bilingual copy-clarity pass on teacher tickets, admin teacher payroll, and partner settlement billing so high-traffic labels read more naturally without changing any workflow logic.
- Key files:
  - `app/teacher/tickets/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-2.md`
- Risk impact (if any): Low. This ship only rewrites UI copy on three existing workbench pages; no ticket write rules, payroll math or approval behavior, partner billing flows, invoice/receipt actions, or storage logic changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3332` confirmed:
    - `/teacher/tickets` renders the new ticket search, status-filter, proof-file, and completion-note copy
    - `/admin/reports/teacher-payroll` renders the new scope labels, jump links, queue wording, and summary-card copy
    - `/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END&month=2026-03&tab=payments` renders the new payment/receipt/billing wording
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `313f3ba` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production:
    - `/teacher/tickets` shows `Search ticket no., student, or teacher` and `All statuses`
    - `/admin/reports/teacher-payroll` shows the new payroll-period, queue, and jump-link copy
    - `/admin/reports/partner-settlement/billing` shows the new payment-record, receipt, and export wording
- Rollback point: previous production commit before `2026-04-03-r04`.

## 2026-04-02-r15

- Release ID: `2026-04-02-r15`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last admin packages filter set so operators can reopen the same package workbench context without rebuilding it.
- Key files:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-packages-filter-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores the package workbench filters on first open when no explicit URL params are provided; no package edit rules, top-up math, billing logic, ledger logic, or focus-return behavior changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3318` confirmed:
    - `/admin/packages` restores `q=赵&paid=unpaid&warn=alert` from cookie when the page is opened without URL params
    - the resumed-filter banner renders on the plain workbench-open path
    - the resumed-filter banner does not appear on `packageFlow=deleted` return pages, while the delete flow card still renders
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/packages` restores the remembered filter set and still suppresses the resume banner on package-flow return pages
- Rollback point: previous production commit before `2026-04-02-r15`.

## 2026-04-02-r14

- Release ID: `2026-04-02-r14`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last admin partner-settlement month/history/panel view so operators can reopen the same workbench context without rebuilding it.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-partner-settlement-view-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores the partner-settlement workbench view on first open when no explicit URL params are provided; no settlement math, settlement creation rules, invoice generation, revert semantics, or approval behavior changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3317` confirmed:
    - `/admin/reports/partner-settlement` restores `month=2026-03&history=receipt-created&panel=history` from cookie when the page is opened without URL params
    - `/admin/reports/partner-settlement` restores `month=2026-03&panel=setup` and now opens the setup disclosure when resumed
    - the resumed-view banner renders on the plain queue-open path and does not appear on `settlementFlow=rate-updated` return pages
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/reports/partner-settlement` restores the remembered month/history/panel view and still suppresses the resume banner on settlement-flow return pages
- Rollback point: previous production commit before `2026-04-02-r14`.

## 2026-04-02-r13

- Release ID: `2026-04-02-r13`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last admin feedback queue and student scope so operators can reopen the same feedback desk context without rebuilding it.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-feedbacks-queue-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores the admin feedback desk queue/student scope on first open when no explicit URL params are provided; no feedback write rules, forward-mark rules, proxy-draft behavior, teacher workflows, or focus-return logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3316` confirmed:
    - `/admin/feedbacks` restores `status=pending` from cookie when the page is opened without URL params
    - `/admin/feedbacks` restores `status=pending&studentId=b54eae8f-461f-4aae-9a22-8ec7a1033c8a` from cookie when the page is opened without URL params
    - the resumed queue banner renders only on the plain queue-open path and does not appear on `feedbackFlow=forwarded` return pages
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/feedbacks` restores the remembered queue/student scope when opened without explicit URL params and still suppresses the resume banner on feedback-flow return pages
- Rollback point: previous production commit before `2026-04-02-r13`.

## 2026-04-02-r12

- Release ID: `2026-04-02-r12`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last queue/filter state on admin receipt approvals and expense claims so operators can reopen the same working dataset without rebuilding it.
- Key files:
  - `app/admin/_components/RememberedWorkbenchQueryClient.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-queue-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores queue/filter context on finance workbench pages; no approval order, selected-item logic, receipt creation rules, expense approval rules, payout logic, or attachment business logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed:
    - receipts approvals restores `queueFilter=FILE_ISSUE&queueBucket=OPEN` from cookie when the page is opened without URL params
    - expense claims restores `approvedUnpaidOnly=1&currency=SGD` from cookie when the page is opened without URL params
    - both pages show an explicit “resumed last queue/filter” hint plus a direct return-to-default link
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `0ff6b71` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed receipts approvals restores `queueFilter=FILE_ISSUE&queueBucket=OPEN` from cookie on production when the page is opened without URL params
  - logged-in live QA confirmed expense claims restores `approvedUnpaidOnly=1&currency=SGD` from cookie on production when the page is opened without URL params
- Rollback point: previous production commit before `2026-04-02-r12`.

## 2026-04-02-r11

- Release ID: `2026-04-02-r11`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the same context-return and next-step shortcut pattern to the admin partner settlement workspace so rate edits and settlement creation / revert actions keep operators oriented.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-partner-settlement-context-return.md`
- Risk impact (if any): Low. This ship only changes post-action navigation, focus anchors, and flow-card guidance on the admin partner settlement page; no settlement rate values, online/offline settlement creation rules, revert semantics, billing rules, or payout calculations changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed:
    - `online-created` flow shows `Online settlement record created.` plus `Open billing workspace / Open next online item`
    - `offline-created` flow shows `Offline settlement record created.` plus `Open billing workspace / Open next offline item`
    - `settlement-reverted` flow shows `Settlement record reverted.` plus `Back to online queue / Back to offline queue`
    - `rate-updated` flow shows `Settlement rates updated.` plus `Jump to setup / Back to live queue`
    - `focusType=online` and `focusType=offline` both land on stable highlighted queue rows with `partner-online-*` / `partner-offline-*` anchors
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `294e118` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the same `online-created`, `offline-created`, `settlement-reverted`, and `rate-updated` flow cards render on production for `month=2026-04`
  - logged-in live QA confirmed both `partner-online-*` and `partner-offline-*` focus-row anchors render on production and still expose `Create online settlement / Create offline settlement`
- Rollback point: previous production commit before `2026-04-02-r11`.

## 2026-04-02-r10

- Release ID: `2026-04-02-r10`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the same context-return pattern to the admin packages workbench so package edit, top-up, and delete actions keep operators oriented.
- Key files:
  - `app/admin/packages/page.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-packages-context-return.md`
- Risk impact (if any): Low. This ship only changes post-action navigation, highlight anchors, and next-step shortcuts on the admin packages page; no package edit rules, top-up math, delete behavior, billing logic, or ledger logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3314` confirmed:
    - `edited` flow shows `Package changes saved.` plus `Jump to this package / Open billing / Open ledger`
    - `topup` flow shows `Top-up saved.` plus `Jump to updated balance / Open billing / Open ledger`
    - `deleted` flow shows `Package deleted.` plus `Open next visible package`
  - source verification confirmed package rows now render stable `package-row-*` anchors and focus styling when return params are present
- Rollback point: previous production commit before `2026-04-02-r10`.

## 2026-04-02-r09

- Release ID: `2026-04-02-r09`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add context-return and focus highlighting to the admin feedback desk so forwarded and proxy-draft actions keep operators oriented.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/feedbacks/MarkForwardedFormClient.tsx`
  - `app/admin/feedbacks/ProxyDraftFormClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-feedbacks-context-return.md`
- Risk impact (if any): Low. This ship only changes post-action navigation, card highlighting, and focus anchors on the admin feedback desk; no feedback write rules, forward-mark rules, proxy-draft persistence, or teacher workflows changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3313` confirmed the forwarded flow card appears with `Open next pending item`
  - fresh local logged-in QA confirmed forwarded/proxy return URLs keep the expected queue-return links when the focused item is not visible
  - source verification confirmed stable anchors now render for feedback cards and overdue-session cards
- Rollback point: previous production commit before `2026-04-02-r09`.

## 2026-04-02-r08

- Release ID: `2026-04-02-r08`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add one more finance follow-up layer so repair-return cards can jump directly to approval or payment areas when the selected item is ready.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-next-action-shortcuts.md`
- Risk impact (if any): Low. This ship only adds anchor shortcuts and conditional next-step links around existing finance return cards; no approval order, payout batching logic, receipt creation rule, or attachment business logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3313` confirmed receipt approvals still shows the unresolved-state safety links (`Open fix tools again`, `Stay on this receipt`) when the selected receipt is not ready yet
  - fresh local logged-in QA on `http://127.0.0.1:3313` confirmed expense claims still shows `Back to selected claim` and `Open all attachment issues` for unresolved repair-return states
  - source verification confirmed the resolved-state paths now include direct anchors to `#receipt-primary-actions`, `#expense-review-actions`, and `#expense-payment-details`
- Rollback point: previous production commit before `2026-04-02-r08`.

## 2026-04-02-r07

- Release ID: `2026-04-02-r07`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Finish the second finance repair-loop pass so receipt proof repairs and expense-claim attachment cleanup return to a clearer ready-to-review state.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-repair-loop-phase-2.md`
- Risk impact (if any): Low. This ship only changes finance repair-result messaging and return-path presentation; no approval order, payout batching, receipt creation rule, attachment storage rule, or business workflow transition changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3311` confirmed receipt approvals now shows the localized proof-repair success label plus the new repair follow-up state card after returning to the selected receipt
  - fresh local logged-in QA on `http://127.0.0.1:3311` confirmed expense claims now shows the repair-loop card with `Back to selected claim` and `Open all attachment issues` when return-context params are present
- Rollback point: previous production commit before `2026-04-02-r07`.

## 2026-04-02-r06

- Release ID: `2026-04-02-r06`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Tighten finance repair-loop navigation, restore remembered student queues on first paint, and add clearer teacher session status summaries.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-repair-loop-and-queue-resume.md`
- Risk impact (if any): Low. This ship only adjusts navigation return paths, remembered-view presentation, and teacher page summaries; no approval order, receipt creation rules, student data rules, attendance submission logic, or feedback submission logic changed.
- Verification:
  - `npm run build` passed
  - local logged-in QA confirmed admin students restores the remembered queue on first render and shows the new resume banner / `Switch to today queue` escape hatch when no explicit `view` is provided
  - local logged-in QA confirmed admin receipt approvals package workspace now carries `nextHref` through upload/delete/create repair flows and keeps the selected receipt return path visible
  - local logged-in QA confirmed teacher session detail now shows `Attendance status / Feedback status / Next action` summary cards while preserving the existing `Step 1 / Step 2` guidance
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the release branch and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-02-r06`.

## 2026-04-02-r05

- Release ID: `2026-04-02-r05`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Shorten the finance attachment-repair path on admin expense claims and receipt approvals without changing approval logic.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-attachment-repair-path.md`
- Risk impact (if any): Low. This ship adds stronger repair-entry cards and shortcut links around existing attachment-issue states, but does not change approval order, queue data, payment rules, receipt creation, or expense-claim workflow logic.
- Verification:
  - `npm run build` passed
  - admin expense claims now shows an explicit `Attachment repair path / 附件修复路径` card whenever the selected review item is missing its file
  - admin expense claims finance payout groups now expose direct repair/history shortcuts when any claim in the selected batch has attachment issues
  - admin receipt approvals now shows an explicit `Proof repair path / 凭证修复路径` card above the receipt detail area whenever proof is missing or the linked file is gone
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the release branch and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-02-r05`.

## 2026-04-02-r04

- Release ID: `2026-04-02-r04`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add targeted admin/teacher UX follow-ups plus a shared local business-file-storage layer for expense claims, payment proofs, shared docs local fallback, and ticket attachments.
- Key files:
  - `lib/business-file-storage.ts`
  - `lib/expense-claim-files.ts`
  - `lib/shared-doc-files.ts`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `app/api/admin/expense-claims/route.ts`
  - `app/api/admin/parent-payment-records/[id]/file/route.ts`
  - `app/api/expense-claims/[id]/receipt/route.ts`
  - `app/api/shared-docs/[id]/file/route.ts`
  - `app/api/teacher/expense-claims/route.ts`
  - `app/api/teacher/expense-claims/resubmit/route.ts`
  - `app/api/tickets/upload/[token]/route.ts`
  - `app/api/tickets/files/[filename]/route.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-storage-helper-and-ux-followups.md`
- Risk impact (if any): Medium-low. This ship touches multiple file-open/upload paths, but keeps the same routes, DB fields, approval rules, ticket flows, and expense-claim business logic; live attachment smoke checks were completed before release closeout.
- Verification:
  - `npm run build` passed
  - `npm run audit:upload-integrity` was run locally; high missing counts were confirmed as local-environment file-disk mismatch, not a regression in the new helper
  - helper smoke check passed for `expense_claim / payment_proof / partner_payment_proof / shared_docs_local / tickets` store-read-delete cycle
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the release branch and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed:
    - `/api/expense-claims/[id]/receipt` returns `200`
    - `/api/admin/parent-payment-records/[id]/file` returns `200`
    - `/uploads/partner-payment-proofs/*` sample links return `200`
    - `/api/shared-docs/[id]/file` triggers the expected file download flow
    - `/api/tickets/files/[filename]` returns `200`
  - targeted UI checks confirmed:
    - admin expense claims and receipt approvals expose attachment-issue triage more clearly
    - admin students page can recover from empty `today` queues and remembers the last queue when no explicit `view` is set
    - teacher session detail now guides teachers to attendance first, feedback second without changing submission rules
- Rollback point: previous production commit before `2026-04-02-r04`.

## 2026-04-02-r03

- Release ID: `2026-04-02-r03`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Turn the admin workspace into a lighter task-first workbench across navigation, homepage, todo center, students, approvals, packages, and feedback flows.
- Key files:
  - `app/admin/AdminSidebarNavClient.tsx`
  - `app/admin/_components/workbenchStyles.ts`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/packages/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-admin-workbench-ux-rollout.md`
- Risk impact (if any): Medium-low. This ship changes admin navigation and high-frequency page presentation across many screens, but does not change routes, permissions, approval order, or underlying business logic.
- Verification:
  - `npm run build` passed
  - admin sidebar now groups work by task area instead of one long always-open menu
  - admin homepage now opens as a task-first workbench instead of a setup-first landing page
  - todo center, students, receipts, expense claims, packages, and feedback pages now lead with current context and next actions before long forms/tables
- Rollback point: previous production commit before `2026-04-02-r03`.

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

## 2026-04-01-r16

- Release ID: `2026-04-01-r16`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a clear package context card to the edit and top-up modal so staff can always see which student and course they are working on.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-context-card.md`
- Risk impact (if any): Low. This only changes package modal presentation; package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - the package modal now shows a top context card with student, course, source, status, remaining balance, and total balance
  - switching between `Edit package / 编辑课包` and `Top-up / 增购` keeps the current package context visible at the top
- Rollback point: previous production commit before `2026-04-01-r16`.

## 2026-04-01-r17

- Release ID: `2026-04-01-r17`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the package modal switch more clearly between edit and top-up by moving the active form directly under the package context card.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-topup-mode-layout.md`
- Risk impact (if any): Low. This only changes admin package modal presentation; package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - switching to `Top-up / 增购` now brings the top-up form immediately under the fixed package context card
  - the always-visible divider between edit and top-up content is removed, so staff no longer feel like they are still inside the edit form when they switch modes
- Rollback point: previous production commit before `2026-04-01-r17`.

## 2026-04-01-r18

- Release ID: `2026-04-01-r18`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Replace hard-to-scan shared student and shared course multi-selects with searchable add/remove pickers in package create and edit flows.
- Key files:
  - `app/admin/_components/SearchableMultiSelect.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-shared-selector-search.md`
- Risk impact (if any): Low. This only changes the admin package create/edit presentation; package creation API behavior, package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - shared students and shared courses can now be searched and added as tags instead of using long native multi-select lists
  - the current student and current course are excluded from their own sharing pickers to reduce accidental self-selection
  - shared student results now show source and active-package context to reduce misclicks when names are similar
- Rollback point: previous production commit before `2026-04-01-r18`.

## 2026-04-01-r19

- Release ID: `2026-04-01-r19`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add selected-sharing summaries and same-course warnings to package create/edit so teaching staff can see sharing scope before saving.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-sharing-warning-summary.md`
- Risk impact (if any): Low. This only adds package form guidance; package creation API behavior, package update API behavior, top-up API behavior, settlement mode rules, overlap checks, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - package create and package edit now show selected shared-student and shared-course counts with quick name previews
  - when selected shared students already have an active package for the same course, the form shows a yellow warning before staff save
- Rollback point: previous production commit before `2026-04-01-r19`.

## 2026-04-01-r20

- Release ID: `2026-04-01-r20`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Turn teacher payroll into a more focused workbench with a role-based work queue and anomaly filters on the detail page.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-work-queue.md`
- Risk impact (if any): Low. This changes payroll page structure and filtering only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - payroll overview now shows a role-aware `My work queue / 我的待处理` and a `Selected payroll / 当前处理老师` action panel
  - teacher payroll detail now supports quick anomaly filters for pending rows, fallback-rate rows, and cancelled-but-charged rows
- Rollback point: previous production commit before `2026-04-01-r20`.

## 2026-04-01-r21

- Release ID: `2026-04-01-r21`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add finance batch payout, exception summaries, and approval timeline guidance to the teacher payroll workflow.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-batch-and-summary.md`
- Risk impact (if any): Low. This only changes teacher payroll page workflow and summary presentation; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - finance can batch-mark multiple finance-ready teachers as paid from the payroll work queue
  - the selected payroll panel now highlights pending sessions, fallback-rate combos, cancelled-but-charged sessions, and approval history
  - teacher payroll detail now opens with exception summary cards before the combo/session tables
- Rollback point: previous production commit before `2026-04-01-r21`.

## 2026-04-01-r22

- Release ID: `2026-04-01-r22`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify teacher payroll status on the teacher side, add anomaly-summary deep links, and surface finance-ready currency grouping for payroll payout.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-status-followup.md`
- Risk impact (if any): Low. This changes payroll page guidance, status wording, and navigation only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher payroll now shows a bilingual current-status card with sent, teacher-confirmed, manager-approved, finance-confirmed, and paid milestones
  - payroll detail anomaly summary cards now deep-link into the matching filtered rows
  - finance-ready payroll queue now shows a currency grouping summary before batch payout
- Rollback point: previous production commit before `2026-04-01-r22`.

## 2026-04-01-r23

- Release ID: `2026-04-01-r23`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add clearer current-owner and next-step guidance to the teacher payroll self-service page.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-owner-guidance.md`
- Risk impact (if any): Low. Teacher-side wording and status guidance only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher payroll status card now shows the current owner and the next expected step in bilingual wording
  - manager/finance waiting states now explicitly name the next handling side instead of only showing a status label
- Rollback point: previous production commit before `2026-04-01-r23`.

## 2026-04-01-r24

- Release ID: `2026-04-01-r24`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make teacher payroll more action-oriented for teachers and add cleaner finance grouping context for payout.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-action-clarity.md`
- Risk impact (if any): Low. Teacher-side guidance and finance queue grouping only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher payroll now shows a stronger action-needed banner plus a visual timeline for send/confirm/approve/payout milestones
  - finance-ready payroll queue now breaks currency groups into clean vs issue-carrying teachers before batch payout
- Rollback point: previous production commit before `2026-04-01-r24`.

## 2026-04-01-r25

- Release ID: `2026-04-01-r25`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: First-round teacher portal cleanup with a today-first dashboard, grouped teacher navigation, and teacher-side language switching.
- Key files:
  - `app/api/teacher/language/route.ts`
  - `app/teacher/TeacherLanguageSelectorClient.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-first-pass.md`
- Risk impact (if any): Low. This changes teacher-side layout, navigation, and language selection only; teacher auth, attendance, feedback, availability, payroll, and expense-claim business rules remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher portal now groups navigation into `Today / My Work / Schedule / Finance`
  - teacher homepage now opens with a task-oriented dashboard instead of a flat menu-style page
  - teachers can switch `中文 / English / Bilingual` from the teacher layout without needing admin-side pages
- Rollback point: previous production commit before `2026-04-01-r25`.

## 2026-04-01-r26

- Release ID: `2026-04-01-r26`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Unify the first-screen look and task framing across high-frequency teacher pages.
- Key files:
  - `app/teacher/_components/TeacherWorkspaceHero.tsx`
  - `app/teacher/sessions/page.tsx`
  - `app/teacher/availability/page.tsx`
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-high-frequency-pages.md`
- Risk impact (if any): Low. This changes teacher-side page framing, summary cards, and quick-entry presentation only; attendance, availability, expense-claim, and payroll business logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher sessions now opens with a unified teacher workspace hero and summary cards for today, next 30 days, pending feedback, and overdue feedback
  - teacher availability now opens with the same workspace shell plus clear summaries for covered days, ranges, next 7 days, and undo state
  - teacher expense claims and teacher payroll now use the same teacher-first page framing and top summary cards as the new dashboard
- Rollback point: previous production commit before `2026-04-01-r26`.

## 2026-04-01-r27

- Release ID: `2026-04-01-r27`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the refreshed teacher workspace framing to alerts, student feedbacks, and tickets.
- Key files:
  - `app/teacher/alerts/page.tsx`
  - `app/teacher/student-feedbacks/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-supporting-pages.md`
- Risk impact (if any): Low. This is a teacher-side presentation and navigation pass only; alert sync rules, feedback read/write logic, ticket transitions, proof links, and completion actions remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher alerts now opens with the same teacher workspace hero and summary-card framing as the refreshed dashboard and high-frequency pages
  - teacher student feedbacks now starts with clear handoff-focused summaries and a dedicated filter section instead of dropping teachers directly into a long list
  - teacher tickets now opens with the same task-oriented framing plus open/urgent/missing-proof summaries before the board table
- Rollback point: previous production commit before `2026-04-01-r27`.

## 2026-04-01-r28

- Release ID: `2026-04-01-r28`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the refreshed teacher workspace framing to teacher card and midterm report pages.
- Key files:
  - `app/teacher/card/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-card-and-midterm.md`
- Risk impact (if any): Low. This is a teacher-side presentation pass only; intro editing, midterm report save/submit behavior, report locking, and PDF export logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher card now starts with the same teacher workspace hero and summary cards before intro editing and PDF export
  - teacher midterm report list now starts with the same workspace hero and summary cards before the task table
  - teacher midterm report detail now starts with a clearer context hero and report summary cards before the form body
- Rollback point: previous production commit before `2026-04-01-r28`.

## 2026-04-02-r01

- Release ID: `2026-04-02-r01`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce first-screen density on the teacher expense-claims and teacher payroll pages.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-finance-density-followup.md`
- Risk impact (if any): Low. This is a teacher-side presentation pass only; expense-claim submission, resubmission, withdrawal, payroll confirmation, payroll calculation, and approval workflow logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher expense claims now starts with action-first cards, keeps new-claim creation in a lighter secondary section, and hides the full claim table inside a history disclosure unless filters are active
  - teacher payroll now focuses first on current action/status, removes repeated status blocks, and keeps detailed calculation tables behind a collapsible section
- Rollback point: previous production commit before `2026-04-02-r01`.

## 2026-04-02-r02

- Release ID: `2026-04-02-r02`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Collapse low-priority teacher sidebar groups and page guides to reduce bilingual-mode density.
- Key files:
  - `app/teacher/layout.tsx`
  - `app/teacher/TeacherSidebarNavClient.tsx`
  - `app/teacher/_components/TeacherWorkspaceHero.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-sidebar-collapse-followup.md`
- Risk impact (if any): Low. This is a teacher-side navigation and presentation pass only; no teacher auth, attendance, availability, payroll, expense-claim, or report business rules changed.
- Verification:
  - `npm run build` passed
  - teacher sidebar groups now collapse by section and auto-open the active area
  - teacher page guides now sit behind `Quick guide / 快速说明`, reducing first-screen text density in bilingual mode
- Rollback point: previous production commit before `2026-04-02-r02`.

## 2026-04-02-r16

- Release ID: `2026-04-02-r16`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Expand remembered student-desk context so the admin students workbench restores the last queue plus lightweight filters when reopened without explicit URL params.
- Key files:
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-students-desk-memory.md`
- Risk impact (if any): Low. This is a student-workbench context and presentation change only; student creation, deletion, filtering semantics, pagination semantics, and student profile/business data logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3319` confirmed `/admin/students` restores the remembered queue plus `q / sourceChannelId / studentTypeId / pageSize` when opened without explicit URL params
  - the resumed-desk banner appears only on the plain reopen path and stays suppressed when explicit `view` or `q` params are present
- Rollback point: previous production commit before `2026-04-02-r16`.

## 2026-04-02-r17

- Release ID: `2026-04-02-r17`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add remembered todo-desk context plus first-screen next-step shortcuts to the admin Todo Center.
- Key files:
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-todos-desk-memory-and-shortcuts.md`
- Risk impact (if any): Low. This is a todo-workbench context and presentation change only; attendance task calculation, reminder confirmation, conflict audit, deduction repair, and renewal-alert business logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3320` confirmed `/admin/todos` reopens with the remembered desk context and shows the resumed-desk banner plus next-step shortcut bar when no explicit URL params are present
  - explicit `warnDays` / `pastDays` URL params still suppress the resumed-desk banner so one-off deep links keep priority over remembered state
- Rollback point: previous production commit before `2026-04-02-r17`.

## 2026-04-02-r18

- Release ID: `2026-04-02-r18`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: turn the existing upload recovery page into an attachment-health workbench and unify finance anomaly entry points toward it.
- Key files:
  - `app/admin/recovery/uploads/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-attachment-health-desk.md`
- Risk impact (if any): Low. This is an admin navigation, access, and presentation pass only; attachment storage rules, recovery/backfill matching, receipt approval logic, expense approval logic, and ticket workflow logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3321` confirmed `/admin/recovery/uploads` renders the new `Attachment Health Desk` workbench, source-filter reopen still works, and both receipts/expense pages expose the new desk entry
  - finance access to `/admin/recovery/uploads` was added through the admin layout allowlist rather than a new auth model
- Rollback point: previous production commit before `2026-04-02-r18`.

## 2026-04-02-r19

- Release ID: `2026-04-02-r19`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: add a sticky action bar plus section return links to the admin student detail page.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-student-detail-action-bar.md`
- Risk impact (if any): Low. This is a student-detail presentation and navigation pass only; student edit logic, quick-schedule submission logic, attendance filter logic, package/billing logic, and session action logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3322` confirmed the student detail page renders the new `Student workbench`, exposes `Back to action bar`, and includes the new `#enrollments`, `#quick-schedule`, and `#edit-student` anchors
- Rollback point: previous production commit before `2026-04-02-r19`.

## 2026-04-02-r20

- Release ID: `2026-04-02-r20`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: add reusable templates plus quick date-copy actions to teacher availability.
- Key files:
  - `app/teacher/availability/TeacherAvailabilityClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-availability-templates-and-copy.md`
- Risk impact (if any): Low. This is a teacher-side availability interaction pass only; availability overlap rules, clear-day rules, undo rules, and slot save/delete APIs remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3323` confirmed `/teacher/availability` renders `Common templates`, `Quick Copy by Date`, `Copy +1d`, and `Copy +7d`
- Rollback point: previous production commit before `2026-04-02-r20`.

## 2026-04-02-r21

- Release ID: `2026-04-02-r21`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: add clearer completion-state guidance to the teacher session-detail page so attendance completion flows into feedback and saved feedback feels finished.
- Key files:
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/teacher/sessions/[id]/TeacherAttendanceClient.tsx`
  - `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-session-completion-guidance.md`
- Risk impact (if any): Low. This is a teacher-side session guidance and presentation pass only; attendance save logic, feedback submit logic, routing, and permissions remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3324` confirmed `/teacher/sessions/ee0a433a-3b5c-4ab3-94fc-38e0a95faf7a` renders `Completion state`, preserves the existing status summary cards, and shows the new attendance/feedback completion guidance copy
- Rollback point: previous production commit before `2026-04-02-r21`.

## 2026-04-03-r01

- Release ID: `2026-04-03-r01`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: trim repeated first-screen copy on teacher payroll so the page says the workflow once instead of repeating the same status in multiple summary blocks.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-payroll-density-trim.md`
- Risk impact (if any): Low. This is a teacher-side payroll presentation pass only; payroll calculation, confirmation, approval, payout, and finance-return logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3325/teacher/payroll` confirmed the page still loads correctly for the current empty-state teacher account
  - current local and production teacher account state is `Admin has not sent this month's payroll yet`, so this release was verified against the empty-state shell plus build output rather than a live sent-payroll record
- Rollback point: previous production commit before `2026-04-03-r01`.

## 2026-04-03-r02

- Release ID: `2026-04-03-r02`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: hotfix duplicated bilingual labels on teacher payroll where some strings were manually written as bilingual text before passing through the bilingual helper.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-payroll-bilingual-duplication-hotfix.md`
- Risk impact (if any): Low. This is a teacher-side payroll copy hotfix only; payroll calculation, confirmation, approval, payout, and finance-return logic remain unchanged.
- Verification:
  - `npm run build` passed
  - local source audit confirmed duplicated labels such as `What happens next`, `Current owner`, `Timeline`, stage pills, and owner labels now use normal `t(lang, en, zh)` strings instead of pre-built bilingual text
  - the current local and production teacher account still lands on the payroll empty state for this month, so this release was verified through source-path cleanup plus build output rather than a live sent-payroll record
- Rollback point: previous production commit before `2026-04-03-r02`.

## 2026-04-03-r03

- Release ID: `2026-04-03-r03`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: make a first admin-side copy-clarity pass on high-frequency workbench pages to reduce slash-heavy or mixed-language labels.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/students/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-1.md`
- Risk impact (if any): Low. This is an admin-side copy cleanup only; receipt queue behavior, settlement/invoice behavior, and student-search behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - targeted copy audit confirmed the updated wording for receipt file-issue links, partner-settlement invoice grouping/status labels, and the student search placeholder
- Rollback point: previous production commit before `2026-04-03-r03`.

## 2026-04-03-r12

- Release ID: `2026-04-03-r12`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: tighten shared mobile layout containment and remove the remaining narrow-screen overflow on teacher payroll / expense workbenches and the admin receipt-approval workflow.
- Key files:
  - `app/layout.tsx`
  - `app/responsive-layout.css`
  - `app/teacher/_components/TeacherWorkspaceHero.tsx`
  - `app/teacher/payroll/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-mobile-shell-and-form-overflow-pass.md`
- Risk impact (if any): Low. This is a responsive UI containment pass only; payroll logic, receipt approval logic, payment-record handling, receipt creation logic, and remembered queue behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - local mobile-width QA on `http://127.0.0.1:3330/teacher/payroll` confirmed stacked hero actions, stacked payroll filters, and `scrollWidth === clientWidth`
  - local mobile-width QA on `http://127.0.0.1:3330/teacher/expense-claims` confirmed no horizontal overflow on the shared teacher workbench shell
  - local mobile-width QA on `http://127.0.0.1:3330/admin/receipts-approvals` confirmed the quick package selector and receipt finance forms no longer overflow, and `scrollWidth === clientWidth`
- Rollback point: previous production commit before `2026-04-03-r12`.

## 2026-04-03-r19

- Release ID: `2026-04-03-r19`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: audit and fix the remaining remembered-workbench pages so explicit blank filter submissions and reset links no longer revive stale remembered queue state.
- Key files:
  - `app/admin/students/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-remembered-filter-blank-param-audit.md`
- Risk impact (if any): Low. This only changes remembered-filter resume rules and default reset links on workbench pages; no package, receipt, expense, settlement, todo, or student business logic changes.
- Verification:
  - `npm run build` passed
  - production read-only QA confirmed explicit reset routes now bypass remembered state on `packages`, `students`, `expense-claims`, `receipts-approvals`, `partner-settlement`, and `todos`
  - production read-only QA confirmed explicit blank query submissions such as `paid=` on packages and `q=` on packages no longer resurrect the previous remembered value
  - post-deploy startup check confirmed `local / origin / server = bd33bef`
  - release docs were synced in a follow-up docs-only commit so the release gate stays aligned with production
- Rollback point: previous production commit before `2026-04-03-r19`.

## 2026-04-03-r20

- Release ID: `2026-04-03-r20`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add a dedicated `Final Reports / 结课报告` workflow with a new DB model, teacher-side fill flow, and admin-side assign/forward center for completed `HOURS` packages.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403202000_add_final_reports/migration.sql`
  - `lib/final-report.ts`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/admin/reports/final/page.tsx`
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-phase-1-and-2.md`
- Risk impact (if any): Medium. This release adds a new Prisma enum/table and new teacher/admin routes, but it does not change midterm-report logic, attendance/deduction logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed the new teacher and admin final-report pages render and the navigation entries are visible
  - release task record was synced in a follow-up docs pass so handoff docs stay aligned with the deployed state
  - final docs sync pass bundled changelog / release board / task in one commit for the release gate
- Rollback point: previous production commit before `2026-04-03-r20`.

## 2026-04-03-r21

- Release ID: `2026-04-03-r21`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: complete the first final-report workflow with admin PDF export and a clearer forwarded-to-parent action.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-pdf-and-forwarded-flow.md`
- Risk impact (if any): Low. This release improves final-report export and admin UI wording only; no assignment rules, teacher submission rules, schema, attendance logic, or finance logic changed.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows `Download PDF` and the forwarded action text now reads as a parent-facing handoff
  - production read-only QA confirmed `/api/admin/final-reports/[id]/pdf` returns `200` with `application/pdf`
- Rollback point: previous production commit before `2026-04-03-r21`.

## 2026-04-03-r22

- Release ID: `2026-04-03-r22`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add final-report parent-delivery records, admin share-link controls, and a public read-only final-report page, while upgrading the printable PDF into a more formal delivery version.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403223000_add_final_report_delivery_and_share/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `app/final-report/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-phase-3a-and-3b.md`
- Risk impact (if any): Medium. This release adds new `FinalReport` metadata columns plus a public token-gated share page, but it does not change midterm-report logic, teacher fill rules, assignment rules, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows delivery actions and parent share-link controls
  - production read-only QA confirmed `/api/admin/final-reports/[id]/pdf` returns `200` with `application/pdf`
  - production read-only QA confirmed a tokenized `/final-report/[id]?token=...` page renders as a parent-safe read-only report
- Rollback point: previous production commit before `2026-04-03-r22`.

## 2026-04-03-r23

- Release ID: `2026-04-03-r23`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add expiry windows to final-report parent share links so operations can issue links with controlled validity and the public page can reject expired tokens cleanly.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403225500_add_final_report_share_expiry/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/final-report/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-share-expiry.md`
- Risk impact (if any): Low. This release only refines share-link validity windows and the public read-only guard page; it does not change teacher report content, delivery records, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows share-duration choices and expiry labels
  - production read-only QA confirmed `/final-report/[id]?token=invalid` still rejects invalid or expired links with the unavailable message
- Rollback point: previous production commit before `2026-04-03-r23`.

## 2026-04-03-r24

- Release ID: `2026-04-03-r24`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add basic share-link access audit for final reports so operations can see whether a parent read-only link has been opened and when it was last viewed.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403232000_add_final_report_share_audit/migration.sql`
  - `app/final-report/[id]/page.tsx`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-share-audit.md`
- Risk impact (if any): Low. This release only records read-only share-page access metadata and surfaces that metadata on the admin workbench; it does not change report content, delivery rules, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows share audit text when a link exists
  - production read-only QA confirmed the public share page still renders and now increments share-view metadata
- Rollback point: previous production commit before `2026-04-03-r24`.

## 2026-04-06-r01

- Release ID: `2026-04-06-r01`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: add a batch CSV export for the teacher payroll workbench so finance can export all teacher salary slips for the current payroll month and current table filters in one file.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/export/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-teacher-payroll-csv-export.md`
- Risk impact (if any): Low. This release only adds a read-only CSV export and a workbench link; it does not change payroll calculation, payroll workflow states, teacher confirmations, approvals, or payout logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/teacher-payroll` shows `Export CSV`
  - production read-only QA confirmed `/admin/reports/teacher-payroll/export?...` returns `200` with `text/csv`
- Rollback point: previous production commit before `2026-04-06-r01`.

## 2026-04-06-r02

- Release ID: `2026-04-06-r02`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: let admins permanently delete shared documents and make shared-document categories show up as clearer folder groupings.
- Key files:
  - `app/admin/shared-docs/page.tsx`
  - `lib/shared-doc-files.ts`
  - `lib/shared-doc-storage.ts`
  - `lib/shared-docs.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-shared-doc-delete-and-folder-groups.md`
- Risk impact (if any): Medium-low. This release adds a real delete path for shared documents and changes new upload paths to include category folders; it does not change shared-doc permissions, teacher/admin workflows outside the shared-doc page, or any finance, attendance, payroll, or reporting logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production UI check confirmed `/admin/shared-docs` now shows grouped category sections with folder hints
  - production UI check confirmed each shared-document row now exposes `Delete / 删除`
- Rollback point: previous production commit before `2026-04-06-r02`.

## 2026-04-07-r01

- Release ID: `2026-04-07-r01`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: fix shared-package midterm/final report assignment so each student on a shared `HOURS` package gets an independent report candidate, assignment, and exempt path instead of being collapsed into the primary package owner.
- Key files:
  - `lib/midterm-report.ts`
  - `lib/final-report.ts`
  - `app/admin/reports/midterm/page.tsx`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-shared-package-report-candidate-fix.md`
- Risk impact (if any): Medium-low. This release changes report-candidate generation and assign/exempt targeting for shared `HOURS` packages, but it does not change report content fields, attendance deduction logic, package balance logic, payroll logic, finance workflows, or report PDF/share behavior.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA should confirm `/admin/reports/midterm` and `/admin/reports/final` now show separate candidate rows for shared-package students when they each have qualifying attendance under the same package
- Rollback point: previous production commit before `2026-04-07-r01`.

## 2026-04-07-r02

- Release ID: `2026-04-07-r02`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: re-layout the final-report PDF into a compact single-page landscape handoff so normal-length reports fit on one page instead of spilling into multi-page output.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-single-page-layout.md`
- Risk impact (if any): Low. This release only changes PDF presentation density and page layout; it does not change final-report content, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the updated single-page landscape layout
- Rollback point: previous production commit before `2026-04-07-r02`.

## 2026-04-07-r03

- Release ID: `2026-04-07-r03`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: simplify the final-report PDF into a more parent-facing handoff by removing internal delivery/admin sections and hiding empty blocks so the one-page layout emphasizes progress, outcome, and next steps.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-parent-facing-pass.md`
- Risk impact (if any): Low. This release only changes the parent-facing PDF presentation and hides internal/admin-only sections from the printable handoff; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the simplified parent-facing layout
- Rollback point: previous production commit before `2026-04-07-r03`.

## 2026-04-07-r04

- Release ID: `2026-04-07-r04`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: reshape the final-report PDF into a more renewal-oriented family handoff so the top summary frames the student's progress and recommended continuation path more clearly.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-renewal-guidance-pass.md`
- Risk impact (if any): Low. This release only changes parent-facing PDF wording and section emphasis; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the updated continuation-focused layout
- Rollback point: previous production commit before `2026-04-07-r04`.

## 2026-04-07-r05

- Release ID: `2026-04-07-r05`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: soften the final-report PDF again so it reads as a parent-friendly growth reflection, focusing on progress, current gaps, and next-stage learning focus instead of explicit renewal guidance.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-gentle-parent-feedback-pass.md`
- Risk impact (if any): Low. This release only changes parent-facing PDF wording and section labels; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the gentler parent-feedback framing
- Rollback point: previous production commit before `2026-04-07-r05`.

## 2026-04-07-r06

- Release ID: `2026-04-07-r06`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: further soften the parent-facing final-report PDF so the section titles and summary row read more like teacher observations to family instead of system labels.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-teacher-letter-tone-pass.md`
- Risk impact (if any): Low. This release only changes parent-facing PDF labels and summary wording; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the softer teacher-to-family tone
- Rollback point: previous production commit before `2026-04-07-r06`.

## 2026-04-07-r07

- Release ID: `2026-04-07-r07`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: remove large empty blocks from the parent-facing final-report PDF by making the lower content cards reflow based on how many filled sections are actually present.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-auto-grid-pass.md`
- Risk impact (if any): Low. This release only changes printable card layout density; it does not change final-report data, wording intent, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the adaptive lower-card layout
- Rollback point: previous production commit before `2026-04-07-r07`.

## 2026-04-07-r08

- Release ID: `2026-04-07-r08`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: remove the remaining duplicate feel in the parent-facing final-report PDF by hiding the extra `Next learning focus` body card whenever the teacher already wrote `Areas to keep strengthening`.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-body-dedup-pass.md`
- Risk impact (if any): Low. This release only changes printable section visibility; it does not change final-report data, summary wording, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with fewer repeated body sections
- Rollback point: previous production commit before `2026-04-07-r08`.

## 2026-04-08-r08

- Release ID: `2026-04-08-r08`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: add split purchase-batch entry for partner package create/top-up flows so 新东方 package sales can be recorded as separate `PURCHASE` tranches like `6h + 30h` instead of one merged balance.
- Key files:
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/_components/PurchaseBatchEditor.tsx`
  - `lib/package-purchase-batches.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-partner-package-split-batch-entry.md`
- Risk impact (if any): Medium-low. This release changes how new HOURS package purchases/top-ups can be recorded into multiple `PURCHASE` txns, but it does not change deduction math, package balance totals, student billing, parent billing, or offline monthly settlement logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - package create and top-up APIs now accept split purchase batches and preserve tranche order for later partner settlement FIFO
- Rollback point: previous production commit before `2026-04-08-r08`.

## 2026-04-08-r09

- Release ID: `2026-04-08-r09`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: switch 新东方 purchase-batch entry from raw minute/hour wording to lesson-based entry so ops can record split sales in `6 / 8 / 10 / 20 / 40 lessons` terms while the backend still stores 45-minute tranches.
- Key files:
  - `app/admin/_components/PurchaseBatchEditor.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-xdf-purchase-batch-lessons-ui.md`
- Risk impact (if any): Low. This release only changes the admin create/top-up entry UI for 新东方 split purchase batches; it does not change the stored FIFO settlement logic, package balances, deduction math, or invoice rules.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - 新东方 split-batch entry now shows lessons-based rows and quick-add chips while still saving 45-minute batch totals underneath
- Rollback point: previous production commit before `2026-04-08-r09`.

## 2026-04-09-r01

- Release ID: `2026-04-09-r01`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: add scheduling coordination tickets on student detail pages so ops can track parent scheduling follow-up, generate candidate slots from trusted teacher availability, and check whether a parent special-time request is inside or outside submitted availability before going back to the teacher.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/tickets/intake/IntakeForm.tsx`
  - `lib/tickets.ts`
  - `lib/scheduling-coordination.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260409100000_add_ticket_student_and_scheduling_coordination/migration.sql`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-phase-1-and-2.md`
- Risk impact (if any): Medium-low. This release adds a nullable `Ticket.studentId`, a new scheduling-coordination ticket type, student-detail coordination helpers, and todo reminders, but it does not change actual session creation, availability rules, booking links, attendance, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - student detail now shows a `Scheduling coordination / 排课协调` card with ticket summary, availability-based candidate slot generation, and special-time availability matching
- Rollback point: previous production commit before `2026-04-09-r01`.

## 2026-04-09-r02

- Release ID: `2026-04-09-r02`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: add a teacher-side `Scheduling Exceptions / 排课例外确认` page so teachers only respond to coordination tickets that already sit outside their submitted availability, instead of being pulled into everyday scheduling back-and-forth.
- Key files:
  - `app/teacher/scheduling-exceptions/page.tsx`
  - `app/teacher/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-teacher-exception-page.md`
- Risk impact (if any): Low. This release adds a teacher-facing view and lightweight ticket status updates for scheduling exceptions, but it does not change teacher availability rules, actual session creation, booking links, attendance, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - teacher portal now includes `Scheduling Exceptions / 排课例外确认`, and the page only lists scheduling coordination tickets in `Waiting Teacher` or `Exception`
- Rollback point: previous production commit before `2026-04-09-r02`.

## 2026-04-09-r03

- Release ID: `2026-04-09-r03`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: make student-detail scheduling coordination much more direct by turning generated slots and availability-backed alternatives into action cards that can jump straight into `Quick Schedule` with the same suggested time and preferred teacher already carried over.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-slot-cards-and-quick-schedule-bridge.md`
- Risk impact (if any): Low. This release only changes student-detail coordination helper presentation and how suggested slots prefill `Quick Schedule`; it does not change teacher availability rules, actual session creation APIs, booking links, attendance, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - generated coordination slots, matched special-time results, and alternative slots now render as action cards with direct `Use in Quick Schedule` entry points
- Rollback point: previous production commit before `2026-04-09-r03`.

## 2026-04-10-r18

- Release ID: `2026-04-10-r18`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance receipt workspace flow more continuous by clarifying post-approval next steps, expanding history filters, compressing repair-card actions, and showing fuller package-workspace progress.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes finance receipt workspace presentation, navigation feedback, and search/filter controls; it does not change invoice creation, receipt approval rules, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - approve/reject actions now either land on the next receipt with a clear `Now reviewing the next item / 现在已切到下一条` banner or return to the default queue with a `This queue section is clear for now / 当前这一组已经清完了` banner when that lane is exhausted
  - `Receipt History / 收据历史` now filters from one form across focus, party side, month, and action type
  - partner-side finance actions now appear in `Recent Finance Actions / 最近财务操作` when the history view is switched to `Partner only / 只看合作方`
  - `Proof Repair / 凭证修复` queue cards now keep one primary fix action visible and move secondary links into `More actions / 更多操作`
  - the package workspace now shows a fourth `Step 4 Approval Queue / 步骤4 进入审批` card plus summary chips for usable proofs, created receipts, waiting approval, and completed receipts
- Rollback point: previous production commit before `2026-04-10-r18`.

## 2026-04-10-r19

- Release ID: `2026-04-10-r19`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: let finance export the filtered receipt history as CSV and make the package finance workspace explicitly tell the user what step to do next.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/history/export/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release adds a read-only CSV export and another finance guidance panel; it does not change invoice creation, receipt approvals, package balances, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - `Receipt History / 收据历史` now exposes `Export CSV / 导出CSV`, and the export follows the active history filters for focus, side, month, action type, and keyword
  - partner-side history actions are included in the CSV when the history view is filtered to `Partner only / 只看合作方`
  - the package workspace now shows a `Suggested next step / 建议下一步` panel that points finance directly to upload, create receipt, approval queue, or back to the global queue depending on current package state
- Rollback point: previous production commit before `2026-04-10-r19`.

## 2026-04-10-r20

- Release ID: `2026-04-10-r20`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the package finance workspace easier to open when finance is dealing with a large number of student packages.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes how finance finds and opens package workspaces; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - the package workspace opener now includes a keyword search input for student, course, invoice no., receipt no., or package ID
  - the same opener now shows a priority package list with direct `Open package / 打开课包` actions, sorted so the most urgent finance packages float first
  - the quick-select dropdown now follows the same filtered search results instead of forcing finance to scan the entire package list
- Rollback point: previous production commit before `2026-04-10-r20`.

## 2026-04-10-r21

- Release ID: `2026-04-10-r21`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: help finance reopen the same few student packages quickly without searching from scratch each time.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/PackageWorkspaceRecentPackagesClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only remembers recent package openings in the browser and adds faster reopen links in the package workspace; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - opening a package from the package workspace search, dropdown, or priority list now records it into `Recently opened packages / 最近打开的课包`
  - the recent-package list appears inside the package workspace with direct reopen actions and a clear button
  - reloading the page keeps the recent-package list because the memory stays in browser local storage, not in billing data
- Rollback point: previous production commit before `2026-04-10-r21`.

## 2026-04-10-r22

- Release ID: `2026-04-10-r22`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: stop the package workspace search from reloading the whole page and give finance a clear confirm flow for opening packages.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/PackageWorkspacePickerClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release moves package searching into a client-side picker and keeps recent-package shortcuts in browser storage; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - package search now filters locally with `Search / 搜索` and `Clear / 清除` buttons instead of reloading the page
  - pressing Enter inside the package search input now applies the local filter instead of submitting a full page request
  - only `Open Finance Operations / 打开财务操作`, `Open package / 打开课包`, or `Open again / 重新打开` navigates into a package
- Rollback point: previous production commit before `2026-04-10-r22`.

## 2026-04-10-r23

- Release ID: `2026-04-10-r23`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance package picker denser so the search area and recent shortcuts take less vertical space.
- Key files:
  - `app/admin/receipts-approvals/_components/PackageWorkspacePickerClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only tightens the layout of the client-side package picker; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - the recent-package list now shows fewer, tighter rows with shorter metadata
  - priority and search-result package cards now use a denser row layout and occupy less page height
  - clearing search also resets the quick-select field back to the current package
- Rollback point: previous production commit before `2026-04-10-r23`.

## 2026-04-10-r24

- Release ID: `2026-04-10-r24`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance student-package invoice page easier to use when the package list is crowded.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/finance/student-package-invoices/_components/PackageSelectAutoSubmit.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only improves package finding on the finance invoice page; it does not change invoice issuance, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - the finance invoice package picker now supports local search by student, course, or package ID
  - the picker no longer auto-submits on every change, so finance can search first and then click `Load package summary / 加载课包摘要`
  - the page still loads package totals and invoice preview only after the chosen package is submitted
- Rollback point: previous production commit before `2026-04-10-r24`.

## 2026-04-10-r01

- Release ID: `2026-04-10-r01`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: add a separate parent package Statement of Account PDF and clarify that formal receipt PDFs only unlock after full manager and finance approval.
- Key files:
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release adds a read-only finance PDF and clearer export copy, but it does not change invoice creation, receipt approvals, package balances, settlement, or deduction logic.
- Verification:
  - `npm run build` passed
  - finance invoice workbench now exposes `Statement of Account PDF` for a selected package
  - package billing now exposes the same statement export and clearer receipt export wording
  - receipt PDF export still requires full manager and finance approval
  - statement PDF now has a more formal finance-style title block, summary strip, and transaction-table hierarchy
  - finance invoice preview and latest-invoice table now show the invoice creator on-page without changing PDF output or billing logic
  - latest invoices now prefer `Name (email)` for creator display when the matching user exists, so finance does not need to decode raw email addresses
  - package billing now uses the same `Name (email)` creator display in the invoice `By` column, so finance sees consistent creator labels across both invoice pages
  - receipt approvals no longer mislabel linked proofs as `file missing` when finance is reviewing the global queue without a specific `packageId`; file health now checks the queue row's actual linked payment record
  - receipt work is now split into clearer finance entry pages: the default page is a focused `Receipt Queue`, while `Package Workspace`, `Proof Repair`, and `Receipt History` each get their own dedicated route and sidebar entry without changing upload, receipt creation, or approval logic
  - `Proof Repair` now defaults to a more practical blocker view that shows rejected receipts and other repair-needed rows, instead of looking empty when there are no literal file-missing items
  - the `All / 全部` chip inside `Proof Repair` now truly expands back to the full repair-page queue instead of silently reapplying the default blocker filter
  - `Receipt History` now hides the conflicting bucket-switch row and only keeps history-appropriate controls, so the top page mode no longer fights with the lower queue toggles
  - `Receipt History` now sends `Back to default queue / 回到默认队列` to the actual receipt queue route instead of reloading the history page with `clearQueue=1`, so finance can truly jump back into active approval work
  - finance sidebar and receipt-page `Receipt Queue / 收据审批队列` links now open the real default approval queue with `clearQueue=1`, so clicking the queue entry no longer re-enters remembered `Receipt History`
  - the top receipt-mode tab `Receipt Queue / 收据审批队列` now uses the same default-queue reset target instead of carrying `queueBucket=HISTORY`, so switching out of `Receipt History` finally returns to the live approval queue
- Rollback point: previous production commit before `2026-04-10-r01`.

## 2026-04-11-r34

- Release ID: `2026-04-11-r34`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: make scheduling-coordination copy bilingual and make duplicate open coordination tickets visible on the student and ticket views.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `app/availability/[token]/page.tsx`
  - `lib/scheduling-coordination.ts`
  - `lib/parent-availability.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-multi-ticket-and-bilingual-copy.md`
- Risk impact (if any): Low. This release only changes scheduling-coordination wording and visibility around duplicate open tickets; it does not change package, finance, receipt, invoice, attendance, or actual lesson-placement logic.
- Verification:
  - `npm run build` passed
  - student detail now warns when more than one open scheduling-coordination ticket exists and shows which ticket is currently driving the coordination card
  - the student coordination card now explains that it picks the ticket with the earliest follow-up due date, then the newest created time
  - scheduling-coordination system copy now renders in bilingual form on the student detail page, ticket detail page, admin ticket list, archived tickets list, and teacher ticket list
  - parent-availability summaries now store bilingual field labels for future submissions
- Rollback point: previous production commit before `2026-04-11-r34`.

## 2026-04-11-r35

- Release ID: `2026-04-11-r35`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: reuse existing scheduling-coordination tickets instead of creating duplicates for the same student.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/tickets/intake/IntakeForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-ticket-reuse.md`
- Risk impact (if any): Low. This release only changes how scheduling-coordination ticket creation is routed when an open ticket already exists for the same student; it does not change scheduling placement, finance, package, receipt, invoice, or attendance logic.
- Verification:
  - `npm run build` passed
  - student detail now shows `Open active ticket / 打开当前工单` and a reuse note instead of encouraging a second open coordination ticket
  - student detail server action now redirects back with a bilingual reuse message when an open coordination ticket already exists
  - intake API now returns the existing open coordination ticket for the same student instead of creating another scheduling-coordination ticket
  - intake form now shows a bilingual reuse success message and preserves the existing parent-availability link when applicable
- Rollback point: previous production commit before `2026-04-11-r35`.
## 2026-04-24-r94

- Scope: auto-add direct-billing renewal hours to the package when the renewal contract is signed, and downgrade old direct top-up into a clearly marked special/manual path.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-direct-billing-renewal-auto-topup.md`
- Risk impact (if any): Medium. This release changes the direct-billing renewal completion flow by adding package minutes after signature. It avoids double top-up by writing and checking a renewal-contract package transaction marker before applying minutes.
- Verification:
  - `npm run build` passed
  - temporary direct-billing renewal QA confirmed package minutes moved from `600 -> 900`
  - the same QA confirmed one invoice draft was created and one `PURCHASE` package txn carried the renewal marker note
  - temporary QA student/package/contract/invoice data was deleted after verification

## 2026-04-24-r95

- Scope: polish the student-contract UX so ops see clearer business-stage states, the student page exposes the contract workspace directly, parent pages are lighter, and archived contract history no longer crowds the active workspace.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/contract-intake/[token]/page.tsx`
  - `app/contract/[token]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-ux-polish.md`
- Risk impact (if any): Low to medium. This release changes contract display and action framing, but does not change signing rules, invoice math, package balances, partner exclusion rules, or receipt logic.
- Verification:
  - `npm run build` passed
  - local QA student detail showed `Open contract workspace / 打开合同工作区` and the new business next-step copy for intake-stage contracts
  - local QA intake page showed `Parent profile confirmation / 家长资料确认`
  - local QA sign page showed `Agreement preview / 正式合同预览`
  - local QA sign-stage billing page showed `Waiting for signature`
  - temporary QA student/package/contract/auth-session data was deleted after verification

## 2026-04-24-r96

- Scope: resync package invoice-gate state when ops edit package settlement mode, so direct-billing packages do not keep stale partner-settlement gate copy.
- Key files:
  - `app/api/admin/packages/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-package-settlement-mode-gate-resync.md`
- Risk impact (if any): Low. This release only recalculates package invoice-gate display state during package edits; it does not change receipt rules, invoice math, partner settlement math, or scheduling logic.
- Verification:
  - `npm run build` passed
  - verified `赵测试` package now shows `settlementMode = null`
  - verified the same package now stores `financeGateReason = Package is exempt from direct-billing invoice gate.`

## 2026-04-24-r97

- Scope: fix signed student-contract signature visibility so future contracts require a handwritten signature image and legacy signed contracts no longer show a blank signature area.
- Key files:
  - `lib/student-contract.ts`
  - `lib/student-contract-pdf.ts`
  - `app/contract/[token]/page.tsx`
  - `app/api/exports/student-contract/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-signature-visibility-fix.md`
- Risk impact (if any): Low to medium. This release tightens future signature submission requirements and changes how legacy signed PDFs are served when no stored signature image exists, but does not change invoice creation math, package balances, or contract snapshot content.
- Verification:
  - `npm run build` passed
  - QA script confirmed sign attempts without handwritten signature now fail with `Handwritten signature is required`
  - generated and rendered a compatibility PDF for an existing signed contract with `signatureImagePath = null`
  - verified the legacy signature block is no longer blank

## 2026-04-24-r98

- Scope: clarify the signed-contract correction path in package billing so ops understand that signed or invoiced contracts no longer expose `Void`, and that the old invoice draft should be stopped before creating a replacement version.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-billing-copy-and-action-simplify.md`
- Risk impact (if any): Low. This release only changes billing-page guidance and action wording for signed/invoiced contracts; it does not change contract state rules, invoice math, package balances, or partner logic.
- Verification:
  - `npm run build` passed
  - verified signed/invoiced contract block now explains the old invoice must be stopped before replacement
  - verified terminal contract warning now explicitly says `Void` is no longer available after signing

## 2026-04-24-r99

- Scope: let ops delete an old unsigned receipt-free invoice draft from a signed contract, detach that old invoice from the contract history, and immediately create a replacement contract version that reuses the previous parent profile.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-invoice-delete-replacement-flow.md`
- Risk impact (if any): Medium. This release changes the correction flow after a signed contract has auto-created an invoice draft, but does not change receipt rules, partner settlement logic, or signed PDF generation.
- Verification:
  - `npm run build` passed
  - temporary QA confirmed deleting the linked invoice draft cleared the contract invoice linkage and moved the contract back to signed history
  - temporary QA confirmed replacement contract creation now produced a new `CONTRACT_DRAFT` and reused the previous parent profile

## 2026-04-24-r100

- Scope: simplify the student-contract billing workspace by removing duplicated signed-result copy and collapsing “save draft” plus “generate/refresh sign link” into one main action.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This release only changes billing-page copy and action flow around contract draft preparation; it does not change contract status rules, signed PDF behavior, invoice creation, or partner exclusions.
- Verification:
  - `npm run build` passed
  - verified contract-draft block now uses one button to save business fields and generate the latest sign link
  - verified the signed-result block no longer repeats bilingual invoice and approval labels
  - release-doc bundle finalized with matching task note

## 2026-04-24-r101

- Scope: make the public contract sign page immediately show a successful submission state after the parent signs, instead of quietly refreshing back into the same page.
- Key files:
  - `app/contract/[token]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-contract-sign-success-feedback.md`
- Risk impact (if any): Low. This release only changes the sign-page refresh and success feedback flow; it does not change contract snapshot content, invoice creation rules, or package balances.
- Verification:
  - `npm run build` passed
  - verified sign submit now revalidates the public contract route before redirecting back
  - verified the sign page now shows a green `Signature submitted successfully` message after submit

## 2026-04-24-r104

- Scope: make parent address optional across the new-student intake flow and the contract parent-profile intake flow, while keeping parent-profile reuse and contract generation working when no address is provided.
- Key files:
  - `app/contract-intake/[token]/page.tsx`
  - `app/student-intake/[token]/page.tsx`
  - `lib/student-parent-intake.ts`
  - `lib/student-contract.ts`
  - `lib/student-contract-template.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-parent-address-optional-intake.md`
- Risk impact (if any): Low. This release only relaxes address validation and hides the address line in generated contracts when no address is provided; it does not change contract signing rules, invoice creation, package balances, or partner exclusions.
- Verification:
  - `npm run build` passed
  - verified both `/student-intake/[token]` and `/contract-intake/[token]` no longer require address
  - verified backend intake submission succeeds without address
  - verified generated contract snapshots omit the address row when no address is present
