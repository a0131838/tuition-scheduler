# TASK-20260724-ticket-action-workflow

## Context

Academic Operations primarily receives parent requests through the employee miniapp and the matching intake link, but the admin Ticket detail page exposed duplicate workflow, status and edit controls. Web schedule changes also opened the correct lesson without carrying the exact Ticket action context, so staff could finish a schedule change while leaving its Ticket action unresolved.

## Change

- Reduced the Ticket detail page to three working layers: request, structured actions, and collapsed history/advanced controls.
- Gave each structured scheduling action one primary command for new lesson, reschedule, cancellation, teacher replacement or coordination.
- Passed the originating Ticket ID and exact Ticket action ID through the admin student scheduling interfaces.
- Applied the schedule change and linked Ticket action inside the same existing database transaction.
- Automatically kept multi-action Tickets open until all actions are resolved, then completed the Ticket, closed parent availability and wrote an audit event.
- Preserved an audited recovery path for schedule work that was already completed outside the Ticket.
- Blocked generic Ticket completion while structured scheduling actions remain unresolved.

## Non-goals

- No migration or historical Ticket backfill.
- No change to standalone scheduling that did not originate from a Ticket.
- No change to miniapp scheduling execution.
- No change to finance, contracts, invoices, receipts, package balances, attendance deduction rules, payroll or partner settlement.
- No automatic archival of completed Tickets.

## Verification

- `node --test --import tsx tests/ticket-scheduling-actions.test.ts tests/ticket-scheduling-action-write.test.ts` passed 16 tests.
- `npx tsx --test tests/*.test.ts` passed all 257 repository tests.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- `npm run build` passed and generated 213 routes.

## Risk

Medium and operator-triggered. Ticket-linked schedule writes now also update the exact Ticket action in the same transaction. Invalid, closed or mismatched Ticket context aborts the schedule transaction. The first production write should use the next real request and should confirm the action result, remaining-action count and audit trail before broader daily use.
