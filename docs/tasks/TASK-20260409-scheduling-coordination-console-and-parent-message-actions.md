# TASK-20260409-scheduling-coordination-console-and-parent-message-actions

## Goal

Make the scheduling coordination workflow easier for ops to run from either the ticket detail page or the student detail page by:

- surfacing a richer coordination console,
- showing the latest parent submission in a structured way,
- adding copyable parent-form link and message actions,
- and letting ops copy suggested-slot messages without rewriting them manually.

## Why

- Operators were still bouncing between the ticket detail page, student detail page, and ad hoc chat messages to keep parent follow-up moving.
- The raw parent submission blob was harder to scan than a small structured summary.
- Suggested slot cards were useful, but ops still had to retype the message they wanted to send to parents.

## Scope

- Add a reusable copy-text button for server-rendered admin pages.
- Expand the admin ticket detail page into a richer `Scheduling Coordination Console`.
- Mirror the same parent-link actions and summary rows on the student detail scheduling card.
- Add `Copy Message` actions to suggested-slot, exact-match, and alternative-slot cards.
- Add a direct parent-link regeneration action from both admin surfaces.

## Verification

- `npm run build`
- deploy and confirm `bash ops/server/scripts/new_chat_startup_check.sh`
- verify `/admin/tickets/[id]` shows the coordination console with:
  - copy link
  - copy message
  - regenerate link
  - latest parent submission summary
- verify `/admin/students/[id]` shows matching controls on the scheduling coordination card
- verify suggested slots expose `Copy Message`

## Files

- `app/admin/_components/CopyTextButton.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `lib/parent-availability.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260409-scheduling-coordination-console-and-parent-message-actions.md`
