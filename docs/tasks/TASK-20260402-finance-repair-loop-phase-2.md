# TASK-20260402 Finance Repair Loop Phase 2

## Goal

Make finance repair follow-ups feel complete by showing clearer success state after proof fixes and by bringing expense-claim operators back to the exact review context they were handling.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- release documentation updates for the same ship

## Changes

1. Admin receipt approvals
- map proof-repair result messages into localized success labels so finance can tell what just happened without decoding raw query params
- add a repair-result state card after package-workspace fixes
- show either `Repair complete` or `One more check is still needed` based on the selected receipt's remaining blockers

2. Admin expense claims
- preserve explicit return context when finance jumps from a selected claim or payout group into attachment cleanup or submitter history
- add a repair-loop card near the top of the page so finance can return to the selected claim or payout group without rebuilding context
- show a stronger resolved state when the chosen claim or payout group no longer has missing attachments

## Non-goals

- no route changes
- no DB schema changes
- no approval-order changes
- no expense-claim approval or payment rules changes
- no receipt creation rule changes
- no attachment existence rules changes

## Validation

- `npm run build`
- local logged-in QA on a fresh dev instance confirmed:
  - receipt approvals shows the new localized proof-repair success label
  - receipt approvals shows the new repair follow-up state card after returning to the same receipt
  - expense claims shows the repair-loop card plus `Back to selected claim` and `Open all attachment issues`

## Release notes

- Release ID: `2026-04-02-r07`
- Risk: low
- Rollback: revert this release if finance users lose their selected claim/payout-group context after repair navigation, or if the new receipt repair-status card misstates whether a receipt is still blocked
