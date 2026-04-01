# TASK-20260401-teacher-payroll-work-queue

## Goal

Make teacher payroll easier for management and finance to operate by adding a focused work queue, a selected-payroll action panel, and quick anomaly filters on the detail page.

## Scope

- Add `My work queue / 我的待处理` to the teacher payroll overview page.
- Add `Selected payroll / 当前处理老师` action panel to the teacher payroll overview page.
- Keep the full salary table for reference, but stop making it the first required workflow.
- Add quick anomaly filters to teacher payroll detail:
  - pending only
  - fallback-rate only
  - cancelled-but-charged only

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

- Completed locally and deployed to production.
