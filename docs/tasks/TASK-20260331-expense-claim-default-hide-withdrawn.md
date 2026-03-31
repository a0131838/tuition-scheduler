# TASK-20260331-expense-claim-default-hide-withdrawn

- Date: `2026-03-31`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Hide withdrawn expense claims from the default teacher list so the page behaves more like a clean active-work list.

## Goal

Make withdrawn claims feel out of the way without deleting audit history.

## Scope

- `app/teacher/expense-claims/page.tsx`
- release documentation only

## Non-Goals

- no change to withdraw logic
- no hard-delete flow
- no approval, payment, or archive changes

## Implementation Notes

- Default `All` teacher view now means `All active claims / 全部有效报销单`.
- `WITHDRAWN` claims are still available through the status dropdown.
- A bilingual helper note explains that withdrawn claims are hidden by default.

## Validation

- `npm run build`
