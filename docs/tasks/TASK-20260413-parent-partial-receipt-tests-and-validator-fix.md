# TASK-20260413-parent-partial-receipt-tests-and-validator-fix

## Goal

After parent multi-receipt support shipped, focused backend tests exposed a leftover validator that still only accepted `InvoiceNo-RC`. This task fixes that validator and adds automated coverage for the critical partial-receipt edge cases.

## Scope

- allow parent receipt numbers in the store layer to accept `InvoiceNo-RC`, `InvoiceNo-RC2`, `InvoiceNo-RC3`, and later
- add automated tests for:
  - numbering progression across the same invoice
  - valid second partial receipt creation up to the remaining amount
  - blocking amount received above the remaining invoice balance
  - rejecting duplicate payment-record reuse across receipts

## Non-Goals

- do not change partner billing
- do not change approval rules
- do not change create-receipt UI defaults
- do not change statement export or package deduction logic

## Validation

- `npx tsx --test tests/billing-optimistic-lock.test.ts`
- `npm run test:backend`
- `npm run build`
