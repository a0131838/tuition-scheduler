# TASK-20260604 School Application Service

## Request

Add an independent school application service signing flow for parents. The service can cover 1 to 5 schools with different school lists and fees per student. The flow should use system signing links and connect to the existing parent invoice and receipt workflow without changing lesson package balances.

## Decisions

- The school application service is separate from lesson packages for balance purposes.
- A billing package is selected only so finance can reuse the existing parent invoice, payment upload, approval, and receipt PDF workflow.
- 1 to 3 schools are non-refundable.
- 4 to 5 schools allow a 50% refund only if all applications fail.
- Conditional offers, next-intake offers, and waitlist outcomes count as successful offers for refund purposes.
- Rejecting a successful offer is not refundable.

## Implementation

- Added `SchoolApplicationService` and `SchoolApplicationEvent` tables with status and event enums.
- Added admin student-page entry to the new school application service workspace.
- Added an admin workspace to create a draft, enter parent details, enter 1 to 5 school fee rows, prepare a parent sign link, export PDF, view linked invoice, and void unsigned or signed service records.
- Added a public parent signing page under `/school-application/[token]`.
- Added PDF generation for unsigned and signed school application service agreements.
- On signature, the system creates a parent invoice with the global `RGT-yyyymm-xxxx` invoice number sequence and marks the school application as `INVOICE_CREATED`.
- Finance document rows now label school application invoices as `Auto from school application`.
- Parent invoice delete actions now block deletion when the invoice is linked to a school application service agreement.

## Verification

- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test against the live Neon database:
  - created a temporary test student and package
  - created a school application service draft
  - entered 3 school rows with service and official fees
  - prepared the sign link
  - generated a PDF with `175870` bytes
  - cleaned up the temporary student/package/application records
  - confirmed remaining temporary students: `0`

## Risk

- Medium risk because this introduces a new agreement-to-invoice source.
- It intentionally reuses parent package billing for receipts, so finance should check the selected billing package before sending the sign link.
- No lesson balance, attendance deduction, scheduling, payroll, partner settlement, transport billing, or Business Accounts logic was changed.
