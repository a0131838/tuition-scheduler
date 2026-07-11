# TASK-20260711 Miniapp Scheduling Ticket Closure

## Goal

Let Eva and management finish the related scheduling-coordination workflow while they complete a real mobile scheduling operation, without silently closing unrelated Tickets.

## Scope

- Return matching open `排课协调` Tickets in the signed scheduling preview.
- Default every Ticket selection to off.
- Let ADMIN staff explicitly select resolved Tickets at final confirmation.
- Revalidate same-student, same-course, open status, and preview eligibility inside the Session write transaction.
- Store the final schedule, completion identity/time, internal history, and audit entry.
- Deactivate the finished Ticket's parent availability link.
- Queue the existing request-status notification only when the Ticket is parent-visible.

## Exclusions

- No automatic Ticket closure without explicit selection.
- No closure of other Ticket types or mismatched courses/students.
- No mobile teacher, room, or campus changes.
- No future-series scheduling changes.

## Verification

- TypeScript and miniapp syntax checks.
- Signed-preview ticket binding and tamper rejection.
- Read-only real-data preview.
- Apply without a valid/eligible Ticket preview is rejected before writes.
- Full production build and post-deploy health checks.
