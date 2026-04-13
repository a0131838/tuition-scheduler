# TASK-20260413-parent-partial-multi-receipt

## Goal

Support real parent-side partial payments by allowing one invoice to carry multiple receipts, while keeping receipt numbering human-friendly and preventing over-receipting.

## Scope

- change parent billing from `1 invoice = 1 receipt` to `1 invoice = many receipts`
- keep the first receipt number as `InvoiceNo-RC`
- start the second and later receipts as `InvoiceNo-RC2`, `InvoiceNo-RC3`, etc.
- block cumulative `amountReceived` from exceeding the invoice total
- update the create-receipt workspace to show `already receipted` and `remaining to receipt`
- update finance workbench to distinguish `Pending Receipt`, `Partially Receipted`, `Pending Approval`, and `Completed`

## Non-Goals

- no partner billing change in this release
- no receipt approval flow rewrite
- no package deduction, scheduling, session, or attendance change
- no historical backfill to rename old `-RC` receipts into `-RC1`

## Risks

- old code paths assumed one invoice maps to one receipt, so finance pages must now aggregate by invoice instead of assuming a single receipt row
- queue and review messaging must stop treating all partial receipts as mismatches, while still catching true over-receipting
- receipt numbering must remain stable for existing `-RC` history records

## Validation

- `npm run build`
- create the first receipt for a parent invoice and confirm it still uses `InvoiceNo-RC`
- create a second receipt on the same invoice and confirm it auto-generates `InvoiceNo-RC2`
- confirm the invoice stays selectable while `remaining to receipt > 0`
- confirm the create form defaults to the remaining amount instead of the full invoice amount
- confirm over-receipting is rejected with a remaining-balance error
- confirm finance workbench shows `Partially Receipted / 部分已开收据` until the invoice is fully covered
