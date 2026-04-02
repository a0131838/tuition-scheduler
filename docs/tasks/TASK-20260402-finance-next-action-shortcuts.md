# TASK-20260402 Finance Next Action Shortcuts

## Goal

Reduce one more layer of finance context-switching by surfacing direct jump links from repair follow-up cards to the next approval or payment area.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- release documentation updates for the same ship

## Changes

1. Admin receipt approvals
- add a direct `Jump to approval controls` shortcut when the selected receipt is clean again after a repair action
- keep unresolved receipts in repair mode by showing `Open fix tools again` plus `Stay on this receipt`
- anchor the receipt action block so finance can land directly on the approval forms

2. Admin expense claims
- add direct jump anchors for review actions and payout payment details
- show `Jump to review actions` or `Jump to payment details` only when the returned review item or payout group is actually ready for the next step
- keep unresolved return states on the safer path with the existing `Back to selected claim / group` and attachment-issue shortcuts

## Non-goals

- no route changes
- no DB schema changes
- no approval-order changes
- no payout batching rule changes
- no receipt creation rule changes
- no attachment existence or storage logic changes

## Validation

- `npm run build`
- local logged-in QA on a fresh dev instance confirmed:
  - receipt approvals shows `Open fix tools again` and `Stay on this receipt` when the selected receipt is still blocked after a repair return
  - expense claims still shows `Back to selected claim` and `Open all attachment issues` when a returned review item is not yet repair-complete
  - source verification confirms review and payment anchor links are rendered for the resolved-state paths

## Release notes

- Release ID: `2026-04-02-r08`
- Risk: low
- Rollback: revert this release if finance repair-return cards start sending users to the wrong section, or if the new anchor shortcuts hide the safer unresolved-state links
