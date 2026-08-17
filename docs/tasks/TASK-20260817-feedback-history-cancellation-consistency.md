# TASK-20260817-feedback-history-cancellation-consistency

## Context

Teacher Quality displayed fully cancelled lessons as missing feedback, and teachers needed a reliable way to find both earlier submitted feedback and older sessions that still required completion. A global audit found other read-only pages using slightly different cancellation rules.

## Change

- Added one shared session teaching state: active, partially cancelled or fully cancelled.
- Excluded fully cancelled sessions from Teacher Quality and teacher/manager active workload, while retaining active students in partially cancelled group lessons.
- Distinguished responsible-teacher final feedback, proxy drafts and genuinely missing feedback.
- Added all-history submitted-feedback filters and a separate historical pending-feedback queue for each teacher's own sessions.
- Changed cancelled student attendance history from `Missing` to `Not required - cancelled`.
- Excluded each cancelled student from academic lesson/feedback statistics and next-session dates.
- Excluded a student's cancelled future session from the parent miniapp next-lesson card.

## Non-goals

- No cancellation or attendance record is changed.
- No package deduction, balance, payroll, invoice, receipt or partner-settlement rule is changed.
- Charged cancellation evidence in partner settlement keeps its existing finance-owned rule.
- Full Care source reports keep their existing student-specific attendance filtering because it already handles group classes correctly per report student.

## Verification

- 34 focused tests passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed with 251 generated pages.
- Read-only reconciliation scanned 914 sessions from 2026-05-01 through 2026-08-17: 803 active, 111 fully cancelled and 0 partially cancelled. Of the fully cancelled sessions, 102 had no feedback and are no longer false missing-feedback candidates.
- `git diff --check` passed.

## Risk

Low to medium. Changes are limited to visibility, feedback classification and read-only statistics. The shared helper is covered for one-to-one cancellation and partial group cancellation, and nearby finance calculations are protected by a regression assertion.
