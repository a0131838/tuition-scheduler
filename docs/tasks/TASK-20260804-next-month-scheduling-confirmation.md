# TASK-20260804 Next-month Scheduling Confirmation

## Objective

Create one controlled month-end workflow so Academic can proactively collect existing students' preferred times 7–10 days before month end, compare the demand with real teacher date availability, and prepare the next month's timetable without waiting for parents to contact the school.

## Business Rules

- One campaign represents one target month.
- One work item represents one student and one course. A shared package never merges different students' grades, subjects, or scheduling requirements.
- Explicitly linked siblings may share one family reminder, but every child/course response remains separate.
- A parent response is scheduling demand only. It never creates, changes, cancels, or confirms a formal Session.
- A completed `SCHEDULED` item is locked against further parent edits; the family must contact the school for another change.
- Teacher capacity and match suggestions use real `TeacherAvailabilityDate` rows only. Weekly templates remain generation helpers and are not counted as schedulable capacity.
- Busy lessons and appointments reduce only overlapping date availability, and each remaining teacher minute is allocated once across courses so a multi-subject teacher is never double-counted.
- Teacher preference is advisory. Academic confirms the final teacher and timetable through the existing scheduling workflow.
- No WeChat message is sent automatically. Staff copy the prepared family message and record follow-up status manually.
- Finance may view demand and staffing forecasts but cannot update campaign or student-course statuses.

## Workflow

1. Admin or Academic opens `/admin/monthly-scheduling`, selects the target month, and creates the campaign.
2. The system syncs eligible active hourly or monthly packages and snapshots current lessons for that month.
3. Teachers enter date-specific availability for the next 62 days. The campaign banner shows the teacher deadline and whether target-month date slots exist.
4. Academic opens the campaign and sends one prepared message per explicitly linked family.
5. Parents open `下月排课确认` in the Parent Mini Program and answer separately for each student/course: keep, change, pause, or contact me.
6. Academic uses the Web or Staff Mini Program queue to record follow-up notes, clarify responses, and review 3–5 qualified teacher/date options.
7. Standard options are executed through the existing scheduling pages. No-match cases create one duplicate-safe internal teacher-exception ticket.
8. Academic marks the item `SCHEDULED` only after the formal timetable is complete.
9. The monthly schedule report shows confirmed demand not yet scheduled and completed scheduling items.

## Default Timeline

- Teacher date availability due: target month minus 12 days.
- Parent campaign opens: target month minus 10 days.
- Parent response due: target month minus 3 days.
- Reminder and no-response follow-up remain manual in this release.

## Data and Safety

- Added isolated `MonthlySchedulingCampaign` and `MonthlySchedulingItem` tables.
- Migration is additive: no existing table or column is dropped, renamed, truncated, or rewritten.
- Candidate sync reads active packages, target-month lessons, and up to 120 days of recent course history so shared-package students keep their actual courses separate; it does not mutate packages, balances, attendance, invoices, contracts, payroll, or sessions.
- Re-sync preserves submitted and processed records. Only untouched stale rows may move to `EXCLUDED`.
- Parent API requires an active parent-student link with `canCreateRequests`.
- Staff Mini Program writes require the existing Academic desk permission.
- Web permissions: ADMIN, CS, CS workspace, or manager can manage; FINANCE is read-only; unrelated roles are denied.

## Main Files

- `prisma/schema.prisma`
- `prisma/migrations/20260803193000_add_monthly_scheduling_campaign/migration.sql`
- `lib/monthly-scheduling.ts`
- `lib/monthly-scheduling-access.ts`
- `app/admin/monthly-scheduling/page.tsx`
- `app/admin/monthly-scheduling/export/route.ts`
- `app/api/miniapp/monthly-scheduling/route.ts`
- `app/api/miniapp/staff/monthly-scheduling/route.ts`
- `miniapp/boss-academic-parent/pages/monthly-scheduling/`
- `miniapp/boss-academic-parent/pages/staff-monthly-scheduling/`
- teacher availability Web/Mini Program files
- `app/admin/reports/monthly-schedule/page.tsx`

## Verification

- Focused monthly scheduling, access, migration, concurrency, input-safety, date, family-message, one-to-one student scope, shared-package, staffing-allocation, and teacher-workbench tests: 22 passed.
- Backend regression: 135 passed.
- Full repository regression: 325 passed.
- Mini Program release audit: 56 pages, zero errors, production API domain, mock login disabled.
- TypeScript: passed.
- Prisma schema validation: passed.
- Next.js production build: passed; 235 pages generated.
- `git diff --check`: passed.

## Deployment and Rollback

- Release candidate: `2026-08-04-r306`.
- Deploy through `bash ops/server/scripts/release_to_server.sh` only after the feature commit is pushed.
- The server release must apply the additive Prisma migration before starting the new application code.
- Post-deploy checks: local/GitHub/server commit equality, PM2 online, `/admin/login` HTTP 200, manager and finance access boundaries, campaign creation, parent item visibility, and Staff Mini Program queue visibility.
- Roll back application code to the previous production commit if runtime verification fails. The two new empty/isolated tables may remain safely because existing workflows do not reference them.
