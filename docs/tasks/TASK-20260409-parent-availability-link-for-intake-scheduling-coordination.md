# TASK-20260409-parent-availability-link-for-intake-scheduling-coordination

## Goal

Allow Emily-style external intake operators to create a `Scheduling Coordination / 排课协调` ticket and immediately get a temporary parent form link so families can submit their available lesson times without logging into the back office.

## Why

- Emily does not operate inside the admin system.
- Parent time collection is currently fragmented across manual messages and ticket notes.
- The scheduling-coordination workflow already exists in the admin/student-detail/todo layer, so the missing piece is a safe external family-input link.

## Scope

- Keep the existing intake flow as the entry point for Emily.
- When the selected ticket type is `Scheduling Coordination`, require a confirmed student match.
- Automatically generate one active parent availability link per coordination ticket.
- Add a public parent form page that only collects availability preferences.
- Push submitted availability back into:
  - the linked coordination ticket
  - the student detail scheduling summary
  - `Todo Center`

## Non-Goals

- Do not auto-create sessions.
- Do not change `Quick Schedule` core behavior.
- Do not change attendance, packages, finance, or payroll logic.
- Do not turn the form into direct parent self-scheduling.

## Data Model

- Add `ParentAvailabilityRequest`
  - `ticketId`
  - `studentId`
  - `courseLabel`
  - `token`
  - `isActive`
  - `expiresAt`
  - `submittedAt`
  - `payloadJson`
- Link one request to one coordination ticket.

## UX Flow

1. Emily opens the existing intake link.
2. Emily selects `Scheduling Coordination / 排课协调`, confirms the student, and submits.
3. Intake success UI shows:
   - ticket number
   - copyable parent link
   - link expiry
4. Parent opens the link and submits available weekdays/time ranges/preferences.
5. The linked ticket updates with a structured summary and a next-action follow-up.
6. Admin operators see the latest state on:
   - student detail
   - ticket detail
   - todo center

## Verification

- `npm run prisma:generate`
- `npm run build`
- post-deploy startup check
- manual intake-link QA for:
  - coordination ticket creation
  - parent link generation
  - parent form submission
  - ticket/student/todo follow-through

## Files

- `app/api/tickets/intake/[token]/route.ts`
- `app/tickets/intake/IntakeForm.tsx`
- `app/tickets/intake/[token]/page.tsx`
- `app/availability/[token]/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/todos/page.tsx`
- `lib/parent-availability.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260409181306_add_parent_availability_requests/migration.sql`
