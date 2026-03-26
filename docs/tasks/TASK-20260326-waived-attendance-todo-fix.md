# TASK-20260326 Waived Attendance Todo Fix

## Goal
- Ensure assessment / waived attendance is not misreported as pending deduction in the todo center.

## Scope
- `app/admin/todos/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Todo-center deduction summary only.
- No change to attendance save behavior.
- No change to package deduction or ledger write logic.

## Validation
1. `npm run build` passes.
2. Attendance rows with `waiveDeduction=true` are not counted as deduction-required.
3. Assessment lessons marked waived show no pending deduction in todo cards.

## Status
- Completed locally; ready for deploy.
