# TASK-20260403-button-hierarchy-and-empty-states

## Goal

Make three high-traffic teacher/admin workbench pages easier to scan by clarifying the primary action, separating destructive actions visually, and turning empty states into explicit next-step guidance.

## Scope

- `app/teacher/payroll/page.tsx`
- `app/admin/expense-claims/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Why

- The payroll page still left teachers with a flat no-data state that did not clearly explain whether any action was needed.
- The expense and receipt approval desks had already become better workbenches, but their action areas still made primary and destructive choices feel too similar.
- Empty queues and unselected states needed to tell operators what to do next instead of just showing blank detail panels.

## Guardrails

- Do not change payroll math, confirmation flow, approval order, payout logic, receipt creation rules, attachment logic, or any server-side business transitions.
- Keep all existing routes, filters, and focus-return behavior intact.
- Limit this pass to visible UI hierarchy and explanatory copy.

## Implementation Notes

1. Add a stronger primary button treatment to teacher payroll actions and the finance workbench apply / approve / pay actions.
2. Give dangerous admin actions a dedicated danger style so reject flows are visually distinct from approve flows.
3. Replace blank or ambiguous no-data states with explicit cards that explain:
   - why the page or pane is empty
   - what the operator should try next
   - where to go with one click

## Verification

- `npm run build`
- Logged-in local QA on `http://127.0.0.1:3335`
  - `/teacher/payroll?month=2099-01&scope=all`
  - `/admin/expense-claims?status=SUBMITTED&month=1999-01`
  - `/admin/receipts-approvals?month=1999-01`
- Logged-in live QA on production after deploy for the same three routes

## Release

- Release ID: `2026-04-03-r07`
- Status: `LIVE`
