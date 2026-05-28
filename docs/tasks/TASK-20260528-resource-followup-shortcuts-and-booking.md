# TASK 2026-05-28 Resource Follow-up Shortcuts And Booking Handoff

## Context

After the first CRM rollout and owner/archive enhancement, the remaining near-term items from the Resource Follow-up plan were small workflow gaps rather than new core modules: faster list filters, a safe way to cancel teacher assessment requests, and a Booking Link handoff after a resource has been converted to a student.

## Shipped Scope

- Added Resource Follow-up quick filters for My Resources, Today, This Week, Hot, Overdue, Pending Assessment, Won, and Lost.
- Shared quick-filter logic between the resource list and CSV export so exported rows match the visible focus filter.
- Added Singapore-day and Singapore-week helper functions for date-based resource filters.
- Added a cancel action for pending or revision-requested teacher assessments.
- Added a Lead detail Booking Link handoff after conversion to Student.
- Added Booking Link create-form prefill support for student, title, and note.

## Out Of Scope

- No automatic contract, package, invoice, or payment creation.
- No change to the Booking Link creation API or scheduling availability logic.
- No physical deletion of real resources.

## Verification

- `npx prisma validate`
- `npx tsx --test tests/leads.test.ts`
- `npm run build`

## Release

- Release ID: `2026-05-28-r156`
- Branch: `feat/strict-superadmin-availability-bypass`
