# TASK-20260710-student-schedule-export-teacher-override

## Context

A student monthly schedule PDF showed Jasmine for a lesson that had been changed from Jasmine to Zoe. The student detail calendar already displayed the replacement history and effective teacher correctly.

## Change

- Updated the student schedule PDF export to include the session-level teacher relation.
- Added a shared helper so exports use the session replacement teacher first, then fall back to the class default teacher.
- Covered both override and fallback behavior with a regression test.
- Added the regression test to the backend test script.

## Non-goals

- Did not change teacher replacement writes.
- Did not change scheduling, attendance deduction, package balances, payroll, billing, partner settlement, miniapp, or OpenClaw behavior.
- Did not recalculate or mutate any historical lesson data.

## Verification

- Read-only DB check confirmed the reported 2026-07-12 lesson has class teacher Jasmine, session teacher Zoe, and effective teacher Zoe.
- `npm run test:backend`
- `npx tsc --noEmit`

## Risk

Low. The change is read-only and limited to the student schedule PDF teacher label.
