# TASK-20260411-scheduling-coordination-multi-ticket-and-bilingual-copy

## Goal

Make scheduling coordination easier to understand when a student has duplicate open coordination tickets, and make system-generated coordination wording consistently bilingual.

## Scope

- expose duplicate open scheduling-coordination tickets on the student detail page
- make the student detail page explain which open coordination ticket it is currently using
- convert scheduling-coordination system copy to bilingual text at the source
- render old coordination summaries through the same bilingual display formatter on key student, ticket, and teacher views
- make parent-availability summary labels bilingual for future submissions

## Non-Goals

- no automatic ticket closing or archival
- no change to scheduling slot generation logic
- no change to finance, packages, receipts, invoices, or attendance logic

## Files

- `app/admin/students/[id]/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/tickets/page.tsx`
- `app/admin/tickets/archived/page.tsx`
- `app/teacher/tickets/page.tsx`
- `app/availability/[token]/page.tsx`
- `lib/scheduling-coordination.ts`
- `lib/parent-availability.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- student detail shows a warning when more than one open scheduling-coordination ticket exists
- the same student detail view identifies which ticket is currently driving the coordination card
- scheduling-coordination summaries display in bilingual form on student, ticket-detail, admin-ticket-list, archived-ticket-list, and teacher-ticket-list pages
- new parent submissions store bilingual parent-availability summary labels
