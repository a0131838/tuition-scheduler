# TASK 2026-05-08 Finance Documents Payment Status Export

## Problem

Finance needs the document center to show whether invoices are paid or unpaid, filter by period, and export a report for Statement of Accounts and follow-up on invoices or receipts created before monetary receipt confirmation.

## Real Data Checked

- Invoice rows: 25
- Paid invoices: 15
- Partial invoices: 1
- Unpaid invoices: 8
- Rejected receipt-linked invoices: 1

## Change

- Added shared finance document row logic in `lib/finance-documents.ts`.
- Added `Payment status / 收款状态` to `/admin/finance/documents`.
- Added filters for:
  - channel
  - type
  - payment status
  - date from
  - date to
  - package ID
  - keyword
- Added Excel export at `/api/exports/finance-documents`.
- Export follows the same filters as the page.

## Payment Status Rule

- `Paid`: finance-approved receipt amount covers the invoice.
- `Partial`: finance-approved receipt amount is greater than zero but less than the invoice.
- `Unpaid`: no finance-approved receipt amount exists.
- `Pending approval`: receipt exists but finance approval is not complete.
- `Rejected`: linked receipt was rejected.

## Not Changed

- Invoice creation
- Receipt creation
- Receipt approval or rejection
- Package deduction
- Student billing
- Partner settlement
- Payroll
- Expense claims
- Scheduling
- Attendance
- Contracts
- OpenClaw

## Verification

- `npx tsx --test tests/finance-documents.test.ts`
- `npx tsc --noEmit`
- `npx next build`
- Real data query confirmed invoice status counts.
