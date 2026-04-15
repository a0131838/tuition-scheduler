# TASK-20260415-receipt-finance-only-approval

## 1) Request

- Request ID: `TASK-20260415-receipt-finance-only-approval`
- Requested by: Zhao Hongwei
- Date: `2026-04-15`
- Original requirement: finance said generated receipts do not need manager approval, so remove that step without breaking other functions.

## 2) Scope Control

- In scope:
  - Make parent and partner receipts complete after finance approval only.
  - Keep receipt reminders in Approval Inbox, but route them only to the finance lane.
  - Remove receipt manager approve/reject controls from the receipt approval UI.
  - Unlock formal receipt PDFs after finance approval only.
  - Update finance-facing status summaries to show finance approval progress instead of manager + finance progress.
- Out of scope:
  - Teacher payroll manager approval.
  - Expense approval.
  - Partner settlement approval.
  - Manager/finance role configuration.
  - Existing receipt amount, invoice, package balance, and payment proof logic.
- Must keep unchanged:
  - Historical receipt approval fields and audit trail.
  - Finance reject/reopen/redo behavior.
  - Super-admin direct correction behavior.

## 3) Findings (Read-only Phase)

- Root cause:
  - Receipt approval completion was checked in several places as `manager approved && finance approved`.
  - The same manager approval infrastructure is also used by teacher payroll and partner settlement, so deleting shared manager approval config or fields would risk unrelated workflows.
- Affected receipt modules:
  - Approval Inbox
  - Receipt Approval Center
  - parent receipt PDF export
  - partner receipt PDF export
  - parent statement PDF
  - finance workbench
  - package billing
  - partner billing
  - receipt history CSV export
  - global invoice resequencing lock
- Impact level: Medium business-flow change, contained to receipt approval policy.

## 4) Plan (Before Edit)

1. Add a small shared receipt approval policy helper.
2. Define receipt completion as finance approval only.
3. Keep legacy manager approval/rejection fields readable for historical records.
4. Remove receipt manager controls from the active receipt approval UI.
5. Update downstream PDF/export/status/reminder checks to use the shared receipt policy.

## 5) Changes Made

- Files changed:
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
- Logic changed:
  - Receipt status is now `COMPLETED` when finance approval is complete.
  - Approval Inbox receipt items now only appear under `Finance approval / 财务审批`.
  - Receipt manager approval and manager reject action blocks are no longer shown in the receipt approval center.
  - Finance approval no longer checks for manager approval first.
  - Parent and partner receipt PDFs now require finance approval only.
  - Parent statement approved/pending receipt totals now follow finance-only receipt approval.
  - Finance workbench, package billing, partner billing, and receipt history export now use finance-only receipt approval status.
  - Global invoice numbers are treated as fixed once the linked receipt has finance approval.
- Logic explicitly not changed:
  - Teacher payroll still keeps its manager approval step.
  - Expense approval still uses its existing approver flow.
  - Partner settlement approval still keeps manager-before-finance logic.
  - Receipt creation, payment proof linking, amount math, invoice numbering format, and package balance math were not changed.

## 6) Verification

- Build: `npm run build` passed.
- Runtime: pending deploy verification.
- Key manual checks:
  - Newly created parent or partner receipt should appear as a finance approval item only.
  - Approval Inbox `Needs manager / 待管理审批` should no longer include receipts.
  - Finance can approve a receipt without prior manager approval.
  - Receipt PDF export should work after finance approval.
  - Teacher payroll and partner settlement manager approval flows should remain unchanged.

## 7) Risks / Follow-up

- Known risks:
  - Old receipt records may still display legacy manager approval/rejection history for audit context.
  - Old manager-rejected receipts still require repair/redo because their rejection reason remains historical state.
- Follow-up tasks:
  - If finance wants even less noise, hide legacy manager timeline rows behind a collapsed history section later.

## 8) Release Record

- Release ID: `2026-04-15-r65`
- Deploy time: pending
- Rollback command/point: previous production commit before `2026-04-15-r65`
