# TASK 2026-04-14 UX Batch 5

## Goal

Carry the tighter queue-workbench pattern into Approval Inbox and Expense Claims by:

- reducing approval-row reading cost
- reducing expense-queue card scanning cost
- adding previous/next navigation inside selected expense review and finance payout panels

## In Scope

- `app/admin/approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- release docs

## Required Outcomes

1. Approval Inbox rows should keep core metadata while using less vertical space.
2. Submitted expense queue cards should be easier to compare in one pass.
3. Approved-unpaid finance group cards should also read in a denser format.
4. Selected submitted claim panel should show explicit previous/next navigation.
5. Selected finance payout group panel should show explicit previous/next navigation.

## Guardrails

- Do not change approval permissions or approval rules.
- Do not change payout logic, payment batch behavior, or attachment rules.
- Keep the existing queue ordering behavior intact.

## Verification

- `npm run build`
- Approval Inbox shows denser rows
- Expense review shows previous/next claim links
- Finance payout panel shows previous/next group links
