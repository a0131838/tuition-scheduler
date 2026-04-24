# TASK-20260424-partner-invoice-final-page-layout-followup

## Summary

Follow up on the partner invoice full-line pagination fix so the last page does not show a large empty gap with bottom-anchored totals and clipped remittance notes.

## Scope

- keep the full line-item pagination from `r105`
- render subtotal / GST / amount due immediately after the last row on the current or summary page
- keep the remittance notes directly below the totals block
- avoid clipping the note block at the bottom of the page

## Files

- `app/api/exports/partner-invoice/[id]/route.ts`

## Risk

- layout-only change to the partner invoice PDF final page
- no changes to invoice data, totals, approvals, or receipt behavior

## Verification

- `npm run build`
- export a partner invoice with enough lines to require a summary page
- confirm the totals block is not pinned to the page bottom
- confirm remittance notes are fully visible on the last page
