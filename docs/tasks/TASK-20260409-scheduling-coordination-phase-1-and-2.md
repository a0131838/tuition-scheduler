# TASK-20260409 Scheduling Coordination Phase 1 and 2

## Goal

Reduce repeated parent ↔ ops ↔ teacher scheduling back-and-forth by keeping scheduling follow-up inside tickets, surfacing the active coordination state on the student detail page, and letting ops generate slot suggestions directly from trusted teacher availability before asking the teacher again.

## Scope

- add a new ticket type for `Scheduling Coordination / 排课协调`
- add nullable `Ticket.studentId` so a coordination ticket can be stably attached to a student
- show the active coordination ticket summary on the student detail page
- allow student detail pages to create or reopen the active scheduling coordination ticket
- add a Todo Center section for coordination items that need follow-up within the next 48 hours
- generate the next 3-5 availability-backed slot suggestions from the current student teaching context
- check whether a parent special-time request already matches submitted teacher availability before routing back to the teacher as an exception
- keep all scheduling helpers read-only for now; no automatic session creation

## Non-Goals

- no changes to actual session creation or quick-schedule execution rules
- no changes to teacher availability data entry
- no changes to booking-link approval flow
- no changes to attendance, package balance, payroll, or finance logic
- no teacher-side exception-confirmation page yet

## Files

- `app/admin/students/[id]/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/todos/page.tsx`
- `app/api/tickets/intake/[token]/route.ts`
- `app/tickets/intake/IntakeForm.tsx`
- `lib/tickets.ts`
- `lib/scheduling-coordination.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260409100000_add_ticket_student_and_scheduling_coordination/migration.sql`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run prisma:generate`
- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- open `/admin/students/[id]` and confirm:
  - the `Scheduling coordination / 排课协调` card is visible
  - the active coordination ticket can be opened or created
  - candidate slots can be generated from availability
  - a special requested time can be checked against current availability
- open `/admin/todos` and confirm the new scheduling coordination follow-up section appears when due items exist
