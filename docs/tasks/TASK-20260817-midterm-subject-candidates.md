# TASK-20260817-midterm-subject-candidates

## Context

Midterm Report candidates were selected when an entire HOURS package reached 45% to 70% consumption. In a shared package, one sibling's lessons could therefore make another sibling appear ready even when that student's own subject attendance was still low. The candidate row also collapsed a student's different subjects into one latest-teacher choice.

## Change

- Calculate the personal reference minutes by dividing package minutes across the package owner and registered shared students.
- Group completed `PRESENT` and `LATE` attendance by package, student and subject.
- Keep the existing 45% to 70% midpoint window, but apply it to actual subject attendance divided by personal reference minutes.
- Fall back to teacher scope only for historical classes without a subject.
- Create separate candidate keys for each package, student and subject.
- Carry `subjectId` through assign and exempt actions and recalculate actual attendance before saving report metadata.
- Reuse exact-subject or legacy no-subject reports to prevent duplicate tasks.
- Show actual subject hours, personal reference hours and shared-student count to operations.

## Non-goals

- Do not auto-assign teacher work; operations still chooses Push or Exempt.
- Do not rewrite existing Midterm Reports.
- Do not change Final Report package-end triggers.
- Do not change attendance, deductions, package balances, scheduling, payroll, invoices, receipts or settlement.

## Verification

- `npx tsx --test tests/midterm-report-candidate-progress.test.ts tests/learning-report-attendance.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- Production read-only comparison of current package-based and proposed student-subject candidate counts.

## Risk

Low to medium. The candidate queue can contain more precise subject rows than before, but no teacher task is created until operations explicitly pushes it. Existing report records and all financial or scheduling data remain untouched.
