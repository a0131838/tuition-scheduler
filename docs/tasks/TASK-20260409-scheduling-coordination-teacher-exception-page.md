# TASK-20260409 Scheduling Coordination Teacher Exception Page

## Goal

Close the last leg of the scheduling-coordination flow by giving teachers a lightweight page for only those parent time requests that sit outside submitted availability.

## Scope

- add `/teacher/scheduling-exceptions`
- list only scheduling coordination tickets in `Waiting Teacher` or `Exception`
- restrict visibility to tickets that belong to the current teacher, either directly by teacher name or through the linked student enrollment
- allow three lightweight replies:
  - `Can do`
  - `Cannot do`
  - `Suggest another slot`
- update the ticket back to an ops-facing next action without exposing the full admin ticket editor by default
- add a teacher sidebar entry for the new page

## Non-Goals

- no changes to teacher availability entry
- no changes to actual session creation
- no changes to booking-link approval flow
- no changes to attendance, payroll, packages, or finance logic

## Files

- `app/teacher/scheduling-exceptions/page.tsx`
- `app/teacher/layout.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- confirm `Scheduling Exceptions / 排课例外确认` appears in the teacher portal
- confirm the page only lists scheduling coordination tickets in `Waiting Teacher` or `Exception`
- confirm teacher actions push the ticket back to ops without changing scheduling execution logic
