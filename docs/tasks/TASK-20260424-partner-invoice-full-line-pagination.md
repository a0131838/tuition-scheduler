# TASK-20260424-partner-invoice-full-line-pagination

## Summary

Remove the hard 10-row truncation from partner invoice PDF exports so finance can see every selected settlement line instead of a collapsed `... and N more items` tail.

## Scope

- paginate all selected `partnerInvoice.lines` in the PDF export
- support multiline descriptions without overlapping amount/GST/total columns
- repeat a continuation header and table header on later pages
- keep subtotal / notes / remittance block on the final page when space allows, or move them cleanly to the next page

## Files

- `app/api/exports/partner-invoice/[id]/route.ts`

## Risk

- layout-only change to the partner invoice PDF
- no changes to invoice totals, selected settlement rows, approvals, or receipt logic

## Verification

- `npm run build`
- export a partner invoice with more than 10 selected settlement items
- confirm every line item appears in the PDF
- confirm the old `... and N more items` summary is gone
- confirm continuation pages repeat key header context and table headings
