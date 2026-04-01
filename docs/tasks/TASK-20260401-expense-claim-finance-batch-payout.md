# TASK-20260401-expense-claim-finance-batch-payout

## Summary
- Add a grouped batch-payout workflow to the admin expense-claim page so finance can process multiple approved unpaid claims for the same submitter and currency together.

## Scope
- `app/admin/expense-claims/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- group approved unpaid claims by submitter and currency
- add `Selected payout group / 当前付款分组`
- allow finance to check or uncheck claims inside a group
- submit one shared payment form to mark the selected claims paid in a single action
- preserve existing single-claim payment behavior in the full history section

## Validation
- `npm run build`

## Status
- Completed and deployed.
