# TASK-20260401-expense-claim-finance-flow

## Summary
- Add a finance-focused queue and selected payout panel to the admin expense-claim page so finance users can process approved-unpaid claims without scanning the mixed history table.

## Scope
- `app/admin/expense-claims/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- add `Finance queue / 财务待处理队列` for approved unpaid claims
- add `Selected payout item / 当前付款项` panel with payment method, payment reference, batch month, and finance remarks
- support `Mark paid & next / 标记已付款并下一条`
- keep existing approval, rejection, archive, and export rules unchanged

## Validation
- `npm run build`

## Status
- Completed and deployed.
