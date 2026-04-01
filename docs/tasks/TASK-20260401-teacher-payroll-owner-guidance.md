# TASK-20260401-teacher-payroll-owner-guidance

## Goal

Make the teacher payroll self-service page more actionable by clearly showing who currently owns the payroll flow and what the teacher should expect next.

## Scope

- Add `Current owner / 当前处理方` to the teacher payroll status card.
- Add bilingual next-step guidance for teacher, manager, finance-confirm, finance-payout, finance-returned, and done states.
- Keep teacher payroll workflow wording clearer without changing approval or payout logic.

## Non-Goals

- No payroll calculation changes.
- No send-flow changes.
- No approval-rule changes.
- No finance payout-rule changes.
- No audit-log changes.

## Files

- `app/teacher/payroll/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`

## Status

- Completed locally and ready for deploy.
