# TASK-20260401-teacher-payroll-status-followup

## Goal

Make teacher payroll clearer for teachers and finance by surfacing the current teacher-side payroll stage, turning exception summary cards into direct drill-down links, and adding a finance-ready currency grouping summary.

## Scope

- Add `Current payroll status / 当前工资状态` to the teacher payroll self-service page.
- Show sent, teacher-confirmed, manager-approved, finance-confirmed, finance-paid, and finance-returned milestones in bilingual human wording.
- Add direct links from payroll anomaly summary cards to the matching filtered rows on the teacher payroll detail page.
- Add `Finance-ready currency group / 可发薪币种组` summary cards above finance batch payout.

## Non-Goals

- No payroll calculation changes.
- No send-flow changes.
- No approval-rule changes.
- No finance payout-rule changes.
- No audit-log changes.

## Files

- `app/teacher/payroll/page.tsx`
- `app/admin/reports/teacher-payroll/page.tsx`
- `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`

## Status

- Completed locally and ready for deploy.
