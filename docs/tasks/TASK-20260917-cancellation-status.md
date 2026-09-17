# TASK-20260917-cancellation-status

## Context

Ava's 2026-09-16 14:00–15:30 cancellation was recorded as EXCUSED with zero deductions before ticket 20260916-001 was submitted. The intake guard correctly blocked duplicate execution but saved an ambiguous “已有点名或扣课” note. The owner authorized both existing-result verification and prompt clarification on 2026-09-17.

## Changes

- Attendance-aware presentation distinguishes zero-deduction leave, actual recorded deduction and configured leave charge. Lock calculation and canAutoExecute values are unchanged.
- Both web/Mini Program intake and source-session lookup pass already-selected attendance fields to the presentation helper.
- Ticket detail shows current attendance and result verification separately from historical intake notes. Stored original notes remain intact.
- Existing service linkTicketResults completed only the specified action and ticket; no duplicate cancellation or balance correction. Before/after session, attendance, student package and ledger equality passed. Server-only backup: /home/ubuntu/sgt-data-correction-backups/TICKET-20260916-001-verification-1789616833810.json.

## Verification

- 30 tests: ticket-cancellation-intake, ticket-result-evidence, ticket-scheduling-actions.
- npm run build passed.
- git diff --check passed.
- Guarded release pending at commit preparation; post-release checks must verify deployed prompt helper, ticket completion, zero deduction, audit, commit equality and health.

## Risk and rollback

Low: presentation and read fields only; no cancellation, accounting, scheduling, payroll or authorization behavior changes. No migration. Refresh required to see current page text. Historical notes retained for traceability. Roll back code to 066e8982b4ab64840febd9fd988c0e2f6e1cca18 if necessary; ticket verification is independent and must not be undone by a code rollback.
