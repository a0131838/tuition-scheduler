# TASK-20260415-approval-receipt-ux-polish

## Request

After a `gstack-qa` pass, apply the small approval and receipt UX optimizations that reduce operator confusion without changing the active business workflows.

## Scope

- Improve Approval Inbox narrow-screen readability.
- Make receipt legacy manager entries clearer as audit history only.
- Remove no-longer-used receipt manager approval page actions from the receipt approval page.
- Clarify super-admin direct correction copy on selected parent receipts.

## Non-goals

- Do not change teacher payroll manager approval.
- Do not change partner settlement manager approval.
- Do not change expense approval.
- Do not change receipt finance approval, receipt creation, invoice math, payment proof linking, export gates, or super-admin correction behavior.

## Files

- `app/admin/approvals/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260415-approval-receipt-ux-polish.md`

## Implementation

1. Added a scoped responsive rule on Approval Inbox so rows stack at narrow viewport widths and the action link remains easy to tap.
2. Removed obsolete receipt manager approve/reject server action definitions from the receipt approval page, matching the finance-only receipt policy.
3. Added an audit-history notice when a selected receipt still has legacy manager approval/rejection data.
4. Updated the direct super-admin correction copy from "approved parent receipt" to "selected parent receipt" so rejected rows are not described incorrectly.

## Verification

- `npm run build`
- `npx tsx --test tests/billing-optimistic-lock.test.ts`

## Risk

Low. The change is limited to UI/copy cleanup and removal of obsolete receipt-manager page actions. Shared manager approval libraries are intentionally kept because teacher payroll and partner settlement still use manager approval.

## Status

Completed locally; ready for deploy.
