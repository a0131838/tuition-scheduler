# TASK-20260718 Ticket Scheduling Work Orders

Release candidate: `2026-07-18-r265`

## Objective

Connect scheduling-related Tickets to exact source and result Sessions without changing the meaning of either existing table. Emily can turn one parent message into one or more executable scheduling actions; Eva and Jasmine see the same work order in web and miniapp workbenches.

## Shipped Scope

- Added additive `TicketSchedulingAction` records under Ticket. Existing Ticket and Session rows remain valid and no historical backfill is required.
- Supported create/replacement lesson, reschedule, cancel/leave, replace teacher, and coordination-only actions.
- Source-session actions require an exact lesson belonging to the Ticket student. Intake derives the course label from that Session.
- A cancellation marked “replacement required” creates a second pending create-session action, so cancellation cannot close the whole Ticket early.
- Existing guarded miniapp scheduling, cancellation and teacher-replacement transactions write matching action results and keep the Ticket open while another action remains.
- Manual Ticket completion is blocked in the web list, web detail and staff miniapp while structured actions remain unresolved.
- Added `/admin/tickets/scheduling` and a scheduling-action workspace to scheduling Ticket detail.
- Emily's miniapp intake loads upcoming lessons and supports multiple actions in one Ticket; screenshot and chat-file evidence remain unchanged.
- Staff coordination and request details show action status, source lesson, result lesson and missing information.

## Compatibility And Safety

- Migration is additive: one new table, indexes and foreign keys only.
- No existing Ticket, Session, Attendance, CoursePackage, PackageTxn, payroll, settlement, finance or notification column is changed.
- Legacy scheduling Tickets with no action rows keep current behavior and appear as “待结构化”; no history is guessed or mutated.
- Formal schedule writes remain ADMIN-only and reuse package/finance gates, teacher qualification, availability, conflict checks, signed preview, confirmation and transaction recheck.
- Structured matching prefers exact source Session; legacy no-action Tickets retain course-label fallback.
- Viewing, searching and opening a student or Ticket remain read-only.

## Verification

- [x] Focused scheduling action tests: `5/5`.
- [x] Backend regression tests: `79/79`.
- [x] Miniapp and WeChat regression tests: `56/56`.
- [x] All native-miniapp JavaScript syntax checks.
- [x] Miniapp release audit: 34 pages, zero errors.
- [x] Prisma schema validation using a non-connecting placeholder URL.
- [x] TypeScript.
- [x] Full production build: 199 pages.
- [x] `git diff --check`.

## Release Gate

- Database migration and server deployment are not part of this implementation checkpoint.
- Before production release: back up the database, apply `20260718143000_add_ticket_scheduling_actions`, deploy the matching server build, then upload a new WeChat experience version.
- Physical-device acceptance covers Emily multi-action intake, Eva reschedule/cancel, Jasmine replacement approval, and cancellation-plus-replacement staying open after cancellation.
