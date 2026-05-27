# TASK-20260527 Tutor Bank Payment Profile

## Request

Some tutors receive payment by bank account instead of PayNow. The tutor payment profile and monthly finance exports need to support both methods.

## Change

- Added `Teacher.paymentMethod`, `bankName`, `bankAccountName`, `bankAccountNumber`, and `bankBranchCode`.
- Preserved existing PayNow fields and defaulted existing PayNow-filled teachers to `PAYNOW` during migration.
- Added bank-transfer inputs to admin teacher create/edit and teacher self-service payment details.
- Added payment method plus bank-transfer columns to teacher payroll CSV, tutor cost cut-off XLSX, and expense-claim CSV exports.

## Verification

- `npx prisma generate`
- `npx tsx --test tests/teacher-payment-profile.test.ts tests/tutor-cost-cutoff.test.ts tests/expense-claims.test.ts`
- `npm run build`

## Risk

Finance exports now include full bank account details. Generated payout files should be handled as sensitive payment data.
