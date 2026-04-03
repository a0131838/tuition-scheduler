# TASK-20260403-teacher-expense-and-alerts-clarity-pass

## Goal

Continue the teacher-side UI clarity pass on expense claims and sign-in alerts so teachers can tell what needs action, what is empty, and which button is primary without reading through dense blocks first.

## Scope

- `app/teacher/expense-claims/page.tsx`
- `app/teacher/alerts/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Why

- The expense-claims desk already had good summary cards, but its filter actions and no-data states still felt too plain.
- The alerts desk still used flat empty states and a weakly emphasized primary action.
- This pass keeps the same teacher-side workbench language now used on payroll, student feedbacks, and tickets.

## Guardrails

- Do not change expense claim submit/resubmit/withdraw rules, expense filters, attachment logic, alert sync, quick-mark behavior, attendance handling, or feedback-overdue detection.
- Keep current routes, page params, and action URLs intact.
- Limit changes to visual emphasis, empty-state guidance, and next-step navigation.

## Implementation Notes

1. Add clear primary / secondary button hierarchy in expense filters and alert cards.
2. Replace flat “no data” lines with cards that explain:
   - why the list is empty
   - whether the teacher should clear filters, open sessions, or return to dashboard/payroll
3. Keep existing action flows intact while making the main alert/session entry visually obvious.

## Verification

- `npm run build`
- Post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- Logged-in live QA on:
  - `/teacher/expense-claims`
  - `/teacher/expense-claims?status=PAID&month=1999-01`
  - `/teacher/alerts`
  - `/teacher/alerts?showResolved=1`

## Release

- Release ID: `2026-04-03-r10`
- Status: `LIVE`
