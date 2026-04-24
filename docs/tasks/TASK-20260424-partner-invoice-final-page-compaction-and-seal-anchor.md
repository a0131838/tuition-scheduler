# TASK-20260424-partner-invoice-final-page-compaction-and-seal-anchor

## Summary

Fix the partner invoice PDF final-page layout so long invoice batches no longer leave a large blank area before the totals, and keep the optional seal visually anchored to the subtotal area instead of drifting toward the lower page.

## Scope

- let line items continue lower on the page before forcing a continuation page
- calculate the final totals + seal + remittance block as one grouped layout section
- keep the optional seal immediately beside the subtotal block
- push remittance notes below whichever is taller: the totals block or the seal block

## Files

- `app/api/exports/partner-invoice/[id]/route.ts`

## Risk

- layout-only change to partner invoice PDF export
- no changes to invoice totals, selected settlement lines, approval logic, or receipts

## Verification

- `npm run build`
- export a multi-page sealed partner invoice
- verify line items continue lower on the last content page before totals
- verify the seal sits against the subtotal block
- verify remittance notes start below the totals/seal group instead of overlapping or drifting upward
