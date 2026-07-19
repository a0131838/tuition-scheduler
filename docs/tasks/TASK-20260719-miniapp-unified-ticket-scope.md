# TASK-20260719-miniapp-unified-ticket-scope

## Context

The employee action centre counted every open non-archived Ticket, but its destination page queried only Tickets whose source was `家长小程序`. This made the action centre show seven Tickets while the destination showed only one.

## Change

- Added an explicit authenticated `scope=all` option to staff Ticket list, detail and attachment reads.
- Kept the existing parent-request source boundary as the default when `scope=all` is absent.
- Changed the employee page title to “全部工单”, added source labels and readable update times, and retained owner, type and status filters.
- Adjusted detail wording for parent requests versus internal Tickets.
- Prevented internal Ticket status updates from queuing parent-miniapp notifications.

## Non-goals

- No Ticket data was edited or backfilled.
- No parent-facing request scope or permissions changed.
- No scheduling, attendance, package, finance, payroll or web UI behavior changed.

## Verification

- `npx tsx --test tests/miniapp-action-center.test.ts tests/miniapp-emily-request-intake.test.ts tests/miniapp-first-scheduling.test.ts tests/ticket-scheduling-actions.test.ts` — 28/28 passed.
- `npm run build` — passed with all 208 routes generated.
- Read-only production query confirmed the live source distribution that caused the mismatch.

## Risk

Low. The broader scope is opt-in and staff-authenticated; existing parent and staff-assisted request callers retain their previous default behavior.
