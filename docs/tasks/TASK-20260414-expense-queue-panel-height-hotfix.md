# TASK-20260414-expense-queue-panel-height-hotfix

## Goal

Stop the selected detail panels in `Expense Claims` from stretching to match a tall left queue when many submitted or approved-unpaid items are visible.

## Scope

- keep the submitted review queue and selected claim panel in a two-column layout
- keep the finance queue and selected payout group panel in a two-column layout
- change only layout alignment so the right-side selected panels stay at their natural content height

## Non-Goals

- no approval-rule changes
- no payment or finance-queue logic changes
- no navigation rewrite

## Files

- `app/admin/expense-claims/page.tsx`
- `docs/UX-REVIEW-20260414.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- with a long submitted queue, the selected claim panel should stay top-aligned and no longer stretch to full column height
- with a long finance queue, the selected payout group panel should stay top-aligned and no longer stretch to full column height
