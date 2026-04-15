# TASK-20260415-approval-inbox-teacher-payroll

## 1) Request

- Request ID: `TASK-20260415-approval-inbox-teacher-payroll`
- Requested by: Zhao Hongwei
- Date: `2026-04-15`
- Original requirement: teacher payroll approvals also need to appear in the Approval Inbox because management and finance both report that they cannot see them.

## 2) Scope Control

- In scope:
  - Add teacher payroll approval reminders to the existing Approval Inbox.
  - Route teacher payroll reminders into the existing manager and finance approval lanes.
  - Show teacher payroll as a distinct approval item type.
  - Preserve a visible return path when opening teacher payroll from the Approval Inbox.
- Out of scope:
  - Changing teacher payroll calculation, approval rules, teacher confirmation rules, finance confirmation rules, or payout rules.
  - Adding a new approval lane or rebuilding the payroll workflow.
- Must keep unchanged:
  - Existing parent receipt, partner receipt, expense claim, and teacher payroll business logic.

## 3) Findings (Read-only Phase)

- Root cause:
  - `lib/approval-inbox.ts` only aggregated parent receipts, partner receipts, and expense claims.
  - Teacher payroll publish records were never read by the Approval Inbox, so pending payroll approvals were invisible there regardless of user permissions.
- Affected modules:
  - Approval Inbox
  - Teacher Payroll
- Impact level: High workflow visibility impact, low business-rule risk.

## 4) Plan (Before Edit)

1. Expose a read-only helper for teacher payroll publish records.
2. Generate Approval Inbox items for teacher payroll records that have reached manager or finance action stages.
3. Keep teacher-waiting and already-complete payroll records out of the inbox.
4. Show teacher payroll labels and multi-currency totals in the approval list.
5. Add an Approval Inbox source-return banner on the teacher payroll page.

## 5) Changes Made

- Files changed:
  - `lib/teacher-payroll.ts`
  - `lib/approval-inbox.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-approval-inbox-teacher-payroll.md`
- Logic changed:
  - Approval Inbox now includes teacher payroll items when:
    - the teacher has confirmed and manager approval is still pending
    - manager approval is complete and finance confirmation is still pending
    - finance confirmation is complete and payout recording is still pending
  - Payroll reminders are counted inside existing `Manager approvals` and `Finance approvals` lanes.
  - Teacher payroll rows display `Teacher payroll / 老师工资` and use the payroll multi-currency total when available.
  - Opening a payroll item from Approval Inbox shows a return banner back to the same approval focus.
- Logic explicitly not changed:
  - No teacher payroll amount calculation changed.
  - No approval permission rule changed.
  - No manager approval, finance confirmation, finance rejection, or payout server action changed.

## 6) Verification

- Build: `npm run build` passed.
- Runtime: pending deploy verification.
- Key manual checks:
  - A teacher-confirmed payroll awaiting management approval should appear under `Needs manager / 待管理审批`.
  - A manager-approved payroll awaiting finance confirmation or payout recording should appear under `Needs finance / 待财务审批`.
  - Clicking the payroll item should open Teacher Payroll with the teacher focused and a return banner back to Approval Inbox.

## 7) Risks / Follow-up

- Known risks:
  - The inbox loads payroll summaries for visible pending payroll month/scope groups. This is acceptable for current usage, but could be optimized further if payroll history grows very large.
  - Existing payroll actions still redirect back to the payroll page after submit; they do not yet auto-return to Approval Inbox.
- Follow-up tasks:
  - Consider preserving Approval Inbox source params through teacher payroll submit redirects if management/finance want a tighter approval-to-next-item loop.

## 8) Release Record

- Release ID: `2026-04-15-r64`
- Deploy time: pending
- Rollback command/point: previous production commit before `2026-04-15-r64`
