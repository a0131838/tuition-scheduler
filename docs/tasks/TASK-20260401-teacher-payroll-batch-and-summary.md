# TASK-20260401-teacher-payroll-batch-and-summary

## Goal

Make teacher payroll easier for finance and operations by adding batch payout from the work queue, stronger exception summaries, and a clearer approval timeline.

## Scope

- Add `Finance batch payout / 财务批量发薪` to the teacher payroll work queue.
- Add exception summary cards to `Selected payroll / 当前处理老师`.
- Add `Approval history / 审批历史` timeline to the selected payroll panel.
- Add exception summary cards to teacher payroll detail.

## Non-Goals

- No payroll calculation changes.
- No send-flow changes.
- No approval-rule changes.
- No finance payout-rule changes.
- No audit-log changes.

## Files

- `app/admin/reports/teacher-payroll/page.tsx`
- `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`

## Status

- Completed locally and ready for deploy.
