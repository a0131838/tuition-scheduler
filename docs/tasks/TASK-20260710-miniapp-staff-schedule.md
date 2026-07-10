# TASK-20260710-miniapp-staff-schedule

## Context

Zhao wants the employee side of `博思学业管家` to support high-frequency mobile work, especially when staff are away from a desktop. 教务 and management need to see same-day lessons for scheduling coordination, while teachers need a mobile view of their own lessons.

## Change

- Added a staff miniapp daily schedule API at `GET /api/miniapp/staff/schedule`.
- Added role scoping so `TEACHER` accounts are forced to their linked teacher schedule, even when the client requests all lessons.
- Added a reusable miniapp staff schedule reader that summarizes course, teacher, student, campus/room, attendance, and feedback state for mobile display.
- Added a staff miniapp schedule page and a workbench entry showing today's course count.
- Added request type filtering to the staff miniapp parent-request queue for schedule coordination, leave/cancel, finance, complaints, feedback, school matters, and teacher messages.

## Non-goals

- Did not add mobile schedule creation or rescheduling writes.
- Did not add teacher feedback submission from the miniapp yet.
- Did not change attendance deduction, package balances, finance records, payroll, partner settlement, transport billing, Business Accounts, or OpenClaw flows.

## Verification

- Miniapp JS syntax and JSON parse checks.
- `npx tsc --noEmit`
- Local staff schedule API smoke checks:
  - unauthorized request returns `401`.
  - admin staff session can read all daily lessons.
  - teacher staff session is forced to `scope: mine`.
- `npm run build`

## Risk

Low to medium. The release adds read-side staff schedule access and a queue filter. The teacher scoping rule is enforced server-side. No scheduling writes, attendance deduction, package ledger, billing, payroll, or OpenClaw behavior is changed.
