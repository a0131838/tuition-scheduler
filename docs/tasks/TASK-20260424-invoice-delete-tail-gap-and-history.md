# TASK-20260424 Invoice Delete Tail Gap And History

## Goal

Change draft invoice deletion so invoice numbers no longer get compacted forward after a middle delete, while still recording exactly which draft number was removed for audit review.

## Scope

- stop resequencing later invoice numbers after deleting a parent or partner invoice draft
- make new invoice numbers follow the highest surviving number for the month, so only a deleted tail number can be reused naturally
- record deleted draft invoice numbers in billing storage history
- surface deleted draft invoice history in package billing, package contract, and partner billing pages

## Non-Goals

- no change to receipt numbering
- no change to paid/fixed invoices beyond existing delete guards
- no change to invoice totals, approval flow, or partner settlement rules

## Files

- `lib/global-invoice-sequence.ts`
- `lib/student-parent-billing.ts`
- `lib/partner-billing.ts`
- `app/admin/packages/[id]/billing/page.tsx`
- `app/admin/packages/[id]/contract/page.tsx`
- `app/admin/reports/partner-settlement/billing/page.tsx`
- `app/api/admin/packages/route.ts`

## Rule

1. deleting a middle draft invoice leaves a visible gap
2. existing later invoice numbers never move forward after that delete
3. deleting the current month-end tail draft allows the next new invoice to reuse that tail slot naturally
4. deleted draft numbers remain visible in history for audit

## Verification

- `npm run build`
- confirm delete actions no longer call monthly resequencing
- confirm deleted parent draft history appears on package billing and package contract pages
- confirm deleted partner draft history appears on partner billing invoices tab
- confirm next new invoice number uses max existing monthly sequence plus one
