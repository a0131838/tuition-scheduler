# TASK-20260411-scheduling-coordination-student-action-sync

## Goal

Make scheduling-coordination progress actions easier to execute from the student coordination page so ops does not need to jump back into the ticket page just to move the status forward.

## Scope

- add shared scheduling-coordination helper copy for:
  - waiting for parent choice after options are sent
  - waiting for teacher exception confirmation
- update the admin ticket quick actions to also write these actions back into the coordination summary
- add equivalent progress actions on the student coordination page:
  - `Mark options sent / 标记已发候选时间`
  - `Mark alternatives sent / 标记已发替代时间`
  - `Ask teacher exception / 转老师例外确认`
- keep the student page on the same coordination helper state after action completion

## Non-Goals

- no automatic scheduling
- no change to teacher exception reply logic
- no change to packages, finance, receipts, invoices, or attendance logic

## Files

- `lib/scheduling-coordination.ts`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npx tsc --noEmit`
- `npm run build`
- ticket detail quick actions now also append clearer follow-up notes into the coordination summary
- student coordination page now lets ops move the coordination item to `Waiting Parent` or `Waiting Teacher` directly from the slot helper cards
- after the action, the student page stays on `#scheduling-coordination` instead of dumping the operator elsewhere
