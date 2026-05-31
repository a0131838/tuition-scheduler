# TASK 2026-05-31 Attendance Convert Assessment Button

## Context

Ops needed a simple way to repair lessons that were accidentally deducted but should have been assessment lessons with waived package deduction.

## Change

- Added a `Convert to Assessment` repair panel to the admin attendance page.
- The panel appears only for attendance rows that currently have deducted minutes or count and are not already waived.
- Clicking the repair action posts one row through the existing attendance save API with:
  - original attendance status, or `PRESENT` if still unmarked
  - deduction minutes/count set to `0`
  - `waiveDeduction=true`
  - `waiveReason=Assessment lesson` unless staff typed a different reason
- The existing save path handles package rollback, ledger consistency validation, and audit logging.

## Verification

- `npx tsc --noEmit`
- `npm run build`

## Risk

Medium. The UI adds a new repair trigger in a package-deduction workflow, but it does not bypass existing backend safeguards or write package balances directly.
