# TASK-20260401-teacher-payroll-action-clarity

## Goal

Make teacher payroll easier to understand at a glance by showing whether the teacher needs to act now, visualizing the payroll timeline, and giving finance a cleaner exception-aware grouping summary before batch payout.

## Scope

- Add a stronger bilingual action-needed banner to the teacher payroll self-service status card.
- Add a lightweight visual timeline for sent, teacher-confirmed, manager-approved, finance-confirmed, and paid milestones.
- Extend finance-ready currency groups to show clean vs issue-carrying teachers before batch payout.

## Non-Goals

- No payroll calculation changes.
- No send-flow changes.
- No approval-rule changes.
- No finance payout-rule changes.
- No audit-log changes.

## Files

- `app/teacher/payroll/page.tsx`
- `app/admin/reports/teacher-payroll/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`

## Status

- Completed locally and ready for deploy.
