# TASK-20260411-ticket-center-zhao-hongwei-hard-delete

## Goal

Allow Zhao Hongwei to permanently delete tickets from the ticket center when a ticket is already closed or archived.

## Scope

- ticket center list should show a permanent delete action only for Zhao Hongwei
- ticket detail should show the same permanent delete action only for Zhao Hongwei
- archived ticket page should also allow Zhao Hongwei to permanently delete archived tickets
- permanent delete must stay limited to completed, cancelled, or archived tickets

## Non-Goals

- no delete permission for other users
- no delete action for still-open tickets
- no change to ticket status flow, archive rules, intake links, scheduling, finance, packages, or attendance logic

## Files

- `app/admin/tickets/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/tickets/archived/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- Zhao Hongwei can see `Delete permanently / 永久删除` on completed or cancelled tickets in ticket center
- Zhao Hongwei can see the same delete action on archived tickets and on ticket detail
- non-Zhao users cannot use the permanent delete action
- open tickets still cannot be permanently deleted
