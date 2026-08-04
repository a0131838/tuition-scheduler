# TASK 2026-08-04: Family-efficient next-month scheduling

## Objective

Reduce repeated parent-Academic coordination while keeping every formal lesson under the existing scheduling validation and approval boundary.

## Delivered

- Derive stable carry-forward suggestions from the previous month's real lessons without changing historical or future sessions.
- Let a parent or authorized staff member confirm all eligible linked children/courses as keep-current in one atomic family action.
- Preserve staff proxy evidence: communication channel, parent reply time, message/summary, operator, and one family batch ID.
- Limit change requests to three ranked time windows: must fit, preferred, and acceptable.
- Order concrete options by time priority first, then qualified teacher preference and capacity.
- Prevent overlapping temporary holds across siblings linked to the same parent.
- Separate the Academic queue into ready confirmation, waiting parent, exceptions, and completed items with readable exception reasons.
- Generate one monthly communication task per family/campaign with all children and courses listed.
- Add a daily idempotent server automation for campaign preparation, configured opening, and overdue no-response routing.
- Surface teachers who have not entered target-month date availability.

## Web and Mini Program Coverage

- Web Academic workbench: family keep, carry-forward schedule, priority inputs, queue lanes, exception reasons, missing teacher availability, and export fields.
- Parent Mini Program: one family keep action, actual-versus-suggested schedule distinction, and three priority levels.
- Staff Mini Program: family keep proxy entry, response evidence, carry-forward context, exception-only handling, and controlled message task entry.

## Safety Boundaries

- Family updates run in a serializable transaction and require every row to remain in its expected editable status.
- Matched, scheduled, or parent-selected work is not overwritten by a family keep action.
- Temporary offer holds check teacher, student, and linked-parent sibling conflicts.
- Automation is idempotent and does not send external messages.
- A scheduling response or temporary offer never creates, changes, or cancels a formal Session.
- No package, balance, attendance, deduction, contract, invoice, receipt, payroll, ticket, or historical lesson data is rewritten.
- The migration adds only nullable columns and an index.

## Verification

- Prisma schema format, client generation, and validation.
- TypeScript compilation.
- Focused carry-forward, family keep, time priority, queue lane, sibling conflict, audit, automation, communication, and migration safety tests.
- Full repository regression tests.
- Parent and Staff Mini Program JavaScript syntax checks and release audit.
- Production Next.js build and release documentation gate.

## Release

- Release candidate: `2026-08-04-r310`.
- Rollback application point: `4ddd9dea8fa3d9875209db3e69cedb3186398c39`.
- Deploy only through `bash ops/server/scripts/release_to_server.sh`.
- Upload the matching Mini Program development version after server health and migration verification.
