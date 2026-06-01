# Business Accounts Payment Proof Receipt Flow

Date: 2026-06-01

## Request

When a company or partner pays a Business Accounts invoice, finance should use the same general flow as existing student and partner receipts: upload the payment record first, then create the receipt from that record.

## Scope

- Add Business Accounts payment records to the existing AppSetting-backed Business Accounts store.
- Store uploaded company payment proof files under `/uploads/business-payment-proofs/`.
- Add a payment record upload panel on the Business Accounts documents page.
- Require an uploaded payment record to be selected before a Business Account receipt can be created.
- Link the selected payment record to the paid monthly document so the uploaded proof cannot be deleted after receipt creation.

## Out of Scope

- No change to parent/student receipt approval logic.
- No change to New Oriental partner billing or partner receipt logic.
- No change to package balances, attendance deductions, scheduling, payroll, or tutor payments.
- Business Account receipts are still created from the Business Accounts workspace; this change does not add Business Account receipts into the central receipt approval queue.

## Verification

- `npx tsx --test tests/billing-optimistic-lock.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`
