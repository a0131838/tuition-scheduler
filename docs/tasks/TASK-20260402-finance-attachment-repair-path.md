# TASK-20260402 Finance Attachment Repair Path

## Goal

Reduce finance-side backtracking when a receipt proof or expense attachment is missing by surfacing direct repair shortcuts inside the current review workspace.

## Scope

- `app/admin/expense-claims/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- release documentation updates for the same ship

## Changes

1. Admin expense claims
- when the selected review claim is missing its attachment, show a dedicated repair card instead of only a status warning
- provide direct shortcuts to:
  - this submitter's attachment-issue queue
  - this submitter's history
  - the global attachment-issue queue
- provide a one-click reject path with `Missing attachment / 缺少附件`

2. Admin finance payout groups
- when any claim in the selected payout group is missing an attachment, show repair/history shortcuts inline in the payout workspace

3. Admin receipt approvals
- when the selected receipt has no proof or a broken linked file, show a dedicated repair card ahead of the rest of the approval detail
- provide direct shortcuts to:
  - the proof/file-issue queue
  - fix tools
  - package billing

## Non-goals

- no route changes
- no DB schema changes
- no approval-order changes
- no payment-rule changes
- no receipt creation logic changes
- no expense-claim approval logic changes
- no attachment storage logic changes

## Validation

- `npm run build`
- manual page review of the updated repair cards in:
  - admin expense claims selected review area
  - admin expense claims selected payout-group area
  - admin receipt approvals selected receipt detail area

## Release notes

- Release ID: `2026-04-02-r05`
- Risk: low
- Rollback: revert this release if finance repair shortcuts misroute users or hide existing approval actions
