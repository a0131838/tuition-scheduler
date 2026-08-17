# TASK-20260817-effective-full-time-payroll

## Context

Teacher payroll previously had course rates only. It could not represent a teacher becoming a full-time employee on a specific date, so changing a rate to zero would also rewrite historical payroll. Finance needs Jessika's standard lessons included in monthly salary from 10 Aug 2026, and Jasmine's and Sharilyn's from 1 Jun 2026.

## Change

- Added effective-dated teacher employment terms with a separate lesson-pay treatment.
- Added session-level pay exceptions requiring a management reason.
- Added month-specific payroll notes, separate from academic lesson feedback.
- Kept full-time lessons visible with hours and contractual hourly equivalent, while setting the payable amount to zero when included in monthly salary.
- Applied the same treatment to admin payroll, teacher web payroll, staff miniapp payroll, payroll CSV, tutor cost preview and tutor cost Excel.
- Seeded Jessika, Jasmine and Sharilyn with the approved effective dates and 2026-08 payroll notes.
- Restricted employment and session override changes to non-finance management; finance can maintain payroll notes only.

## Non-goals

- No academic lesson feedback is created, edited or backfilled.
- No historical course rate is overwritten.
- No attendance, package deduction, invoice, receipt, expense or partner-settlement behavior changes.
- No separately payable exception is inferred automatically.

## Verification

- 10 focused payroll tests passed, including exact effective-date boundaries, exclusive end dates, session override priority, migration seeds and cancellation payroll behavior.
- `npx tsc --noEmit` passed.
- `npm run build` passed with 251 generated pages.
- Prisma schema validation and `git diff --check` passed.
- Production reconciliation after deployment must confirm Jessika's pre-10-Aug lessons retain their prior value, her 10-Aug onward lessons are zero, and Jasmine/Sharilyn lessons in the 2026-08 payroll period are zero.

## Risk

Medium because this changes payroll calculation and adds database tables. Risk is limited by effective dates, preserved contractual amounts, required exception reasons, permission separation and post-deploy reconciliation against the three named teachers.
