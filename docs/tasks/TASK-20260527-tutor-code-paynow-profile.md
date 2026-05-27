# TASK-20260527 Tutor Code and PayNow Profile

## Request

Finance needs a stable serial number for every tutor because multiple tutors share the same first name, and monthly tutor payroll plus expense-claim reimbursement exports need PayNow details.

## Change

- Added `Teacher.tutorCode`, `payNowType`, `payNowValue`, `payNowName`, and `payNowNote`.
- Backfilled existing teachers with deterministic `T###` tutor codes.
- Added admin create/edit support for tutor code and PayNow fields.
- Added a teacher portal payment-details page for teachers to maintain their own PayNow details.
- Added tutor code and PayNow columns to teacher payroll CSV, tutor cost cut-off XLSX, and expense-claim CSV exports.

## Verification

- `npx prisma generate`
- `npx tsx --test tests/teacher-payment-profile.test.ts`
- `npx tsx --test tests/tutor-cost-cutoff.test.ts tests/expense-claims.test.ts tests/teacher-payment-profile.test.ts`
- `npm run build`

## Risk

PayNow values are intentionally exported in full for finance payout work. Generated finance files should be handled as sensitive payment data.
