# TASK-20260403-teacher-card-midterm-payroll-clarity-pass

## Goal

Continue the teacher-side UI clarity pass on the teacher card, midterm reports, and payroll desk so error states, empty states, and primary actions use the same clear workbench language as the rest of the teacher portal.

## Scope

- `app/teacher/card/page.tsx`
- `app/teacher/midterm-reports/page.tsx`
- `app/teacher/midterm-reports/[id]/page.tsx`
- `app/teacher/payroll/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Why

- These pages still had some old-style flat error/empty messages that made teachers stop and guess what to do next.
- Midterm list/detail actions were not yet using a consistent primary vs. secondary hierarchy.
- Payroll already improved earlier, but some linked-profile errors, invalid-month handling, and filter actions still felt less polished than the newer teacher pages.

## Guardrails

- Do not change teacher intro save logic, card export logic, report save/submit logic, report locking rules, payroll calculations, payroll confirmation behavior, payout workflow, or report/task assignment logic.
- Keep current routes, params, and action handlers intact.
- Limit changes to presentation, action emphasis, and next-step guidance.

## Implementation Notes

1. Replace flat not-linked / not-found / no-task messages with workbench-style guidance cards.
2. Make list/detail actions easier to scan by clearly separating primary and secondary actions.
3. Add small next-step prompts where the teacher still needs to finish profile intro or return to the correct desk.

## Verification

- `npm run build`
- Post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- Logged-in live QA on:
  - `/teacher/card`
  - `/teacher/midterm-reports`
  - `/teacher/payroll`

## Release

- Release ID: `2026-04-03-r11`
- Status: `LIVE`
