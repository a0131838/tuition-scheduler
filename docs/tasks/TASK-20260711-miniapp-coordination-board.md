# TASK-20260711 Miniapp Coordination Board

## Goal

Give Eva and management a single mobile queue for scheduling coordination, including overdue visibility and direct follow-up updates.

## Scope

- Add open and overdue coordination counts to the staff home.
- List all open `排课协调` Tickets ordered by follow-up date.
- Filter by overdue state, workflow status, and owner.
- Search by student, course, or Ticket number.
- Open Ticket detail and update communication target/result, valid status, next action, and follow-up date.
- Show communication history and copy the active parent availability link.
- Write every update and audit record atomically.
- Queue existing parent status notifications only for parent-visible Tickets.

## Permissions

- ADMIN: allowed.
- CS: allowed.
- Active CS workspace: allowed.
- Teacher and other staff without CS workspace: denied.

## Exclusions

- The board cannot directly complete a Ticket.
- The board cannot create, reschedule, cancel, or change a teacher/room.
- Final Ticket completion remains in the signed mobile scheduling workflow.

## Verification

- Permission and unauthenticated checks.
- Authenticated real-data list and detail reads.
- Invalid update rejection with unchanged Ticket verification.
- TypeScript, miniapp syntax/JSON, and full production build.
