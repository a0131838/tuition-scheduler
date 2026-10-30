# TASK-20261030-staff-feedback-improvements

## Context and authorization

User approved the five staff-feedback improvements. The fourth item was clarified to a maximum of four continuous teaching hours followed by at least 15 minutes rest. Jasmine's personal maximum must be confirmed separately; no unlimited exception was authorized. Changes are isolated from the dirty original checkout.

## Changes and operator paths

1. Teacher Lead Desk displays external classroom reservations and links to `/teacher/lead/rooms`. Authorized staff can create/edit XDF, 2B or other named organization reservations, repeat weekly up to 12 occurrences, record contact/purpose and cancel/complete. Bookings and active formal lessons share per-room locking and reject overlap. Attendance/roster restoration checks protect freed rooms. Adjacent intervals are allowed. External bookings do not create lessons, attendance deductions or payroll.
2. Web teacher lesson feedback offers explicit Not Set for previous homework and an explicit no-homework marker for current homework. The added Boolean distinguishes no previous assignment from an unanswered field; publication completeness, forward text, Mini Program DTOs and learning evidence preserve this meaning. Prior data is not reclassified.
3. Invoice & Receipts accepts an exact student ID and displays SGD invoice receivable, received, unpaid and pending approval totals. Invoices are deduplicated by channel and ID; void invoices excluded; receipts are not added a second time. Excel includes the same summary worksheet. Current shared-package membership can match the whole family invoice, visibly disclosed rather than allocating an invented child-specific amount.
4. Default teacher rule is 240 taught minutes with at least 15 minutes rest. Shorter gaps remain within the same continuous block but are not counted as teaching; overlapping/group intervals count once. The teacher-calendar rule editor is owner/manager-only, requires an agreement/reason, optimistic version and audit. Jasmine inherits default pending separate confirmation. Finite personal limits may be saved; there is no automatic unlimited exception or new per-lesson approval queue. Service prechecks and database guards cover Session, Appointment, teacher replacement, attendance restoration and roster changes. Rescheduling previews exclude the original lesson. No historical scheduling rows are rewritten.
5. Teacher calendar supports month PDF, week PDF and print at `/calendar/teacher`. Teachers can download only their own; authorized admins/leads can access other teachers. Finance-only, anonymous and unrelated teacher access is denied. Dates are Singapore time; cancellation and optional availability/block/approved-leave information are included. Mobile month print view scrolls horizontally.

## Verification

- `npm run build` passed (268 generated routes); TypeScript checked by build.
- `npx tsx --test tests/*.test.ts`: 806 tests. An existing whitespace-sensitive HR source assertion was satisfied by formatting the same APPROVED status literal; no HR behavior change.
- `tests/staff-feedback-improvements.test.ts`: boundaries at four hours/14 versus 15 minute break, bridging, individual limits, duplicate lessons, no-homework semantics and invoice deduplication.
- Fresh isolated database `sgt_staff_feedback_test` at 127.0.0.1:55439: all official migrations applied successfully from empty database.
- `scripts/qa/staff-feedback-resource-uat.ts`: four-hour and six-hour limits, 15-minute reset, excluding original reschedule, mutual lesson/booking conflict, adjacency, cancellation and blocked restoration rollback, concurrent room and teaching writes with one winner, explicit no-homework persistence. All passed.
- `scripts/qa/staff-feedback-http-uat.ts`: actual authenticated Web and Mini Program feedback POST/GET; missing feedback rejection; manager-only/stale-safe rule writes; real server-action recurring booking; Lead Desk GET; PDF month/week and cross-account denials; admin print; SGD1000 invoice / SGD300 received / SGD700 unpaid and identical Excel. All passed on isolated fixtures, without external sends.
- Browser visual checks: finance, teacher rule editor, reservation form, lesson feedback, desktop/mobile print. PDF month and week rendered with Poppler and visually inspected; overflowing weeks paginate.
- Evidence: `/Users/zhao111/Documents/sgt系统/交付文件/20261030-教务反馈优化`.

## Release and rollback

- Baseline and rollback application commit: `512e46b4c036775b5bdb3f36ffcfac2784e988da` (r483).
- Apply the three additive Prisma migrations through the standard server deploy. Keep new records on rollback; reverting application code alone does not remove the database enforcement triggers. Review those triggers explicitly for a policy rollback.
- Use `release_to_server.sh --check`, then the guarded standard release; verify exact local/GitHub/server equality, PM2 PID, HTTP200 and applied migrations. Deployment output is the source of live completion evidence.

## Remaining limits

- Jasmine's individual maximum remains unconfirmed and unchanged from the inherited rule.
- Mini Program source is updated but no WeChat client was uploaded or formally published by this release.
- Shared invoices are not apportioned across siblings. Summary is based on matching invoice scope, including invoice issue dates; document type filtering does not alter the invoice totals.
- Very dense month calendars can span PDF pages. These new scheduling restrictions can reject previously accepted future arrangements; operators must insert rest or obtain a confirmed personal rule.
