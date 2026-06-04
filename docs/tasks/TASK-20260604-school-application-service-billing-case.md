# TASK-20260604 School Application Service Billing Case

## Request

Make the school application service workflow convenient for finance and academic operations by preventing school application invoices and receipts from mixing into normal lesson packages.

## Implementation

- Changed school application draft creation to always use or create the student's separate `School Application Service` billing case.
- Changed draft saving to keep the school application on the separate service billing case even if an old form or hidden field submits a normal package id.
- Removed the package selector from the student school-application page to prevent staff from choosing a normal lesson package by mistake.
- Updated page copy to explain that the billing case is only for invoice, payment proof, receipt creation, and finance approval.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test:
  - created a temporary student with a normal 80-hour lesson package
  - created a school application draft while passing the normal package id
  - confirmed the draft used a separate service billing case instead
  - saved the draft while passing the normal package id again
  - confirmed the record still used the service billing case
  - confirmed the normal package remaining minutes stayed at `4800`
  - cleaned up temporary test data and confirmed no temporary students remained

## Risk

Low. Existing signed/invoiced school application records keep their current invoice linkage. New and editable school application records are isolated into the service billing case. Receipt approval, invoice numbering, lesson package balances, attendance deduction, scheduling, payroll, partner settlement, and Business Accounts are unchanged.
