# TASK-20260529-tutor-wise-payment-profile

## Context

Finance requested that tutor payout details stop using manual bank-transfer entry for new submissions. Local tutors should use PayNow/PayLah-linked PayNow details so the bank account name can be verified before processing, while overseas tutors should provide Wise identifiers.

## Change

- Limited tutor payment methods to PayNow and Wise for new profile submissions.
- Added Wise account holder, email, phone, WiseTag, country, currency, and note fields.
- Added payment-profile review status, verified timestamp/by, and rejection reason fields.
- Made teacher self-updates return the profile to pending finance review.
- Kept historical bank-transfer details visible as read-only legacy reference.
- Added Wise details and profile review status to payroll, expense-claim, and tutor-cost cutoff exports.

## Non-goals

- Did not change payroll amount calculation.
- Did not change expense approval, attendance deduction, scheduling, package balance, invoice, or receipt logic.
- Did not delete legacy bank-transfer data.

## Verification

- `npx prisma generate`
- `npx tsc --noEmit --pretty false`
- `npx tsx --test tests/teacher-payment-profile.test.ts`
- `npm run test:backend`
- `npm run build`

## Risk

Medium. The release changes tutor payout-profile collection and finance export columns, so finance should verify PayNow/Wise details before using the exported payout data. Nearby payroll calculation and approval workflows are intentionally unchanged.
