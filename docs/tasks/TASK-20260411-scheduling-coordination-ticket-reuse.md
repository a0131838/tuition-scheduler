# TASK-20260411-scheduling-coordination-ticket-reuse

## Goal

Reduce duplicate scheduling-coordination tickets by reusing the current open ticket for the same student whenever possible.

## Scope

- student detail should reuse the current open coordination ticket instead of pretending to create another one
- scheduling coordination intake API should return the current open ticket when the same student already has one
- intake UI should explain that the current coordination ticket was reused
- keep all copy bilingual where the system generates the message

## Non-Goals

- no automatic ticket closing or archival
- no change to scheduling slot generation logic
- no change to finance, packages, receipts, invoices, or attendance logic

## Files

- `app/admin/students/[id]/page.tsx`
- `app/api/tickets/intake/[token]/route.ts`
- `app/tickets/intake/IntakeForm.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- student detail shows only an `Open active ticket / 打开当前工单` action when an open coordination ticket already exists
- student detail shows a clear reuse note instead of encouraging another ticket
- ticket intake API returns the existing open coordination ticket for the same student instead of creating a duplicate scheduling ticket
- intake form shows a bilingual reuse success message when the existing coordination ticket is returned
