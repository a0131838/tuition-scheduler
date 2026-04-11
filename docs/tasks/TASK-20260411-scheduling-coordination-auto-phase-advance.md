# TASK-20260411-scheduling-coordination-auto-phase-advance

## Goal

Continue the scheduling-coordination flow so the ticket state and next action advance automatically after the parent submits available lesson times.

## Scope

- add shared scheduling-coordination helper copy for the waiting-parent stage
- add a shared helper that derives the next ticket update after a parent submission based on matched availability count
- on `/availability/[token]`, evaluate current teacher-availability matches right after the parent submits
- auto-update the linked coordination ticket to a more accurate ops-facing follow-up state:
  - matching slots found -> `Need Info` with "matching slots ready" guidance
  - no current matches -> `Need Info` with "review alternatives first, then teacher exception if needed" guidance
- refresh related admin pages after the public form submission
- keep teacher-exception, quick schedule, session, package, and finance logic unchanged

## Non-Goals

- no automatic scheduling
- no new enums or database schema changes
- no change to manual quick actions for `Mark options sent` or `Ask teacher exception`
- no change to receipt, invoice, settlement, package, or attendance logic

## Files

- `lib/scheduling-coordination.ts`
- `app/availability/[token]/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npx tsc --noEmit`
- parent availability submission still succeeds from `/availability/[token]`
- after submission, the linked scheduling-coordination ticket auto-updates its `status`, `parentAvailability`, and `nextAction` based on whether current teacher availability contains matching slots
- ticket/student pages continue to use the same waiting-parent copy from a shared helper
