# TASK-20260424-partner-invoice-seal-near-subtotal

## Summary

Move the optional seal on partner invoice PDFs so it appears beside the subtotal summary area instead of being fixed near the page bottom.

## Scope

- keep the full-line pagination and final-page flow from `r105` and `r106`
- place the seal relative to the subtotal block on the last page
- keep the totals text readable when the seal is enabled

## Files

- `app/api/exports/partner-invoice/[id]/route.ts`

## Risk

- layout-only change to the optional seal placement
- no changes to invoice rows, totals, approvals, or receipt behavior

## Verification

- `npm run build`
- export a sealed partner invoice
- confirm the seal sits next to the subtotal block
- confirm subtotal / GST / amount due remain readable
