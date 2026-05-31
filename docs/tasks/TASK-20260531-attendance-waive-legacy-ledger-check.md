# TASK 2026-05-31 Attendance Waive Legacy Ledger Check

## Context

Ops reported that an assessment lesson could not be saved as `Assessment / Waive deduction` after the student had already been deducted through a previous repair flow.

The failing production row was for student `1a83aed9-a52b-44e4-8e44-68293f0e9f86` on session `169c4362-8a49-438f-8b35-09848f11ff74`. The earlier package transaction was created by the undeducted-completed repair report and its note contained `attendanceId=bc00897f-e395-436f-955d-468ffe75bba5`, but not `studentId=...`.

## Root Cause

The attendance save route correctly generated a rollback when the row was changed to waive deduction. The post-save ledger consistency checker, however, only attributed package transactions to students when the transaction note contained `studentId=...`.

For older repair transactions keyed by `attendanceId=...`, the checker ignored the original deduction and only saw the new rollback, producing a false mismatch like `expectedNet=0, actualNet=30`.

## Change

- Added `attendanceId` note parsing to the attendance save ledger consistency check.
- Mapped touched attendance row IDs back to their student IDs before calculating net package movement.
- Applied the same compatibility logic to the `mark-all-present` route so both attendance save paths interpret legacy repair transactions consistently.

## Verification

- `npx tsc --noEmit`
- Simulated the affected transaction pattern:
  - repair transaction: `attendanceId=...`, `deltaMinutes=-30`
  - rollback transaction: `studentId=...`, `deltaMinutes=30`
  - computed net: `0`

## Risk

Medium. This is in attendance/package ledger validation, but the change is narrow and does not bypass the consistency check. It only lets historical `attendanceId` repair notes be assigned to the correct touched student.
