# TASK-20260804 Monthly Scheduling Concrete Options

## Objective

Reduce Academic's repeated WeChat coordination with families by converting broad next-month availability into concrete teacher/time choices that parents can rank, while preserving the existing formal scheduling validations and ownership.

## Confirmed Workflow

1. Academic starts or continues the existing next-month campaign.
2. A parent answers separately for each student and course. Shared-package siblings are never merged into one academic requirement.
3. When the parent requests a change, the server compares that student's course, the parent's allowed dates/times, teacher qualification, real date-specific teacher availability, existing lessons, and appointments.
4. The system stores up to five concrete options. These are proposals only and are not formal lessons.
5. The parent ranks up to three options in order of preference.
6. In a serializable transaction, the first choice that is still free is held for 24 hours. Competing active holds and accepted options for the same teacher/date ranges are rejected.
7. Academic sees the item in `待确认`, reviews the exact option, and accepts the parent choice.
8. Academic opens the existing student scheduling page with safe prefills. That page still performs the original qualification, date availability, lesson/appointment, student, teacher, room, package, and duplicate validations before any Session is written.
9. Academic marks the item completed only after a real target-month lesson exists.
10. If the family needs another change, the original formal arrangement remains in place and a new exception item is raised for Academic follow-up.

## Queue Design

- `待确认`: parent selected a temporarily held option.
- `等家长`: reminder not sent, sent/viewed, or concrete options waiting for selection.
- `异常`: no standard option, clarification needed, teacher exception, or a post-match change request.
- `已处理`: matched, formally scheduled, or paused.
- `全部`: lookup only.

This removes the previous long status-tab list from normal Academic work while retaining every underlying audited status.

## Data and Concurrency

- Added `MonthlySchedulingOffer` only; no existing table or record is rewritten by the migration.
- Each offer belongs to one monthly item and one teacher and stores concrete target-month dates.
- Parent ranking is limited to three unique offer IDs owned through an active parent-student link with `canCreateRequests`.
- A 24-hour hold expires back to the parent-selection queue without cancelling or changing a formal lesson.
- Staff acceptance uses the current `PARENT_SELECTED` state as an optimistic guard.
- Formal completion retains the existing real-session evidence check.

## Explicit Non-Goals

- No automatic WeChat send is introduced because WeChat subscription templates require configured template IDs and user consent.
- No parent action directly creates, reschedules, cancels, or replaces a formal lesson.
- No package, package balance, attendance, deduction, finance, contract, payroll, ticket, or historical lesson workflow changes.
- No hidden sibling inference is made from a shared package; only explicit parent-student links define a family.

## Mini Program Release

- Existing omitted-code recovery was uploaded as WeChat development version `1.0.21` before this release.
- After `2026-08-04-r307` server health is confirmed, upload a new development version containing the concrete-option workflow.
- WeChat experience designation, review submission, and formal publication remain manual account-security steps in WeChat DevTools/MP Admin.

## Verification

- Prisma schema validation: passed.
- TypeScript: passed.
- Focused monthly-scheduling tests: 19 passed.
- Full repository regression: 328 passed.
- Mini Program JavaScript syntax checks: passed.
- Mini Program release audit: 56 pages, zero errors, production API domain, mock login disabled, source maps disabled.
- Complete Next.js production build: 235 pages, passed.
- `git diff --check`: passed.

## Deployment and Rollback

- Release candidate: `2026-08-04-r307`.
- Standard path only: `bash ops/server/scripts/release_to_server.sh --check`, then `bash ops/server/scripts/release_to_server.sh`.
- The release applies the additive Prisma migration before the application restart.
- Trust deployment only after local/GitHub/server commit equality, live PM2 PID, and `/admin/login` HTTP 200 are confirmed.
- Application rollback target: `2aa09cf08d63dd5cdf3d3db6006e7598c8db59e4`.
- The isolated offer table may remain after an application rollback because earlier code does not read it.
