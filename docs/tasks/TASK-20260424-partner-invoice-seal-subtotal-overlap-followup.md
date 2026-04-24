# TASK-20260424-partner-invoice-seal-subtotal-overlap-followup

## Summary

Follow up on the seal move so the optional partner invoice stamp visibly anchors to the subtotal area, instead of feeling detached lower on the page.

## Scope

- keep the final-page flow from `r106`
- keep the subtotal-adjacent seal intent from `r107`
- move the seal closer so it visibly sits against the subtotal block
- preserve readability of subtotal / GST / amount due

## Files

- `app/api/exports/partner-invoice/[id]/route.ts`

## Risk

- layout-only change to the optional seal placement
- no changes to invoice data, totals, approvals, or receipt behavior

## Verification

- `npm run build`
- export a sealed partner invoice
- confirm the seal is visually attached to the subtotal block
- confirm subtotal / GST / amount due remain readable
