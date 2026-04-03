# TASK-20260403-midterm-report-exempt-phase-1

## Goal

Add an admin-only `EXEMPT / 无需报告` path to Midterm Reports so operations can remove no-report midpoint tasks from the workflow without keeping unnecessary teacher follow-up open.

## Why

- Some students/packages do not require a midterm report at all.
- Keeping those tasks in the normal midterm queue creates avoidable noise for both operations and teachers.
- The system should distinguish `not done yet` from `not required`.

## Scope

- Add `EXEMPT` to `MidtermReportStatus`
- Store exemption metadata on `MidtermReport`
  - `exemptReason`
  - `exemptedAt`
  - `exemptedByUserId`
- Add admin `Mark exempt / 标记无需报告` from:
  - midpoint candidate rows
  - existing midterm-report records
- Add `Exempt` filter/count to the admin midterm-report center
- Hide exempted tasks from the teacher midterm-report list
- Prevent exempted teacher/package pairs from resurfacing in candidate assignment options

## Non-Goals

- No `Archive` status yet
- No final-report changes
- No changes to package progress rules, attendance, finance, PDF generation, or forwarded-lock behavior

## Risks

- This adds a Prisma enum/schema migration
- Admins could exempt the wrong report if reason selection is careless
- Candidate filtering must not suppress valid non-exempt teacher options

## Validation

- `npm run prisma:generate`
- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- production read-only QA confirms:
  - `/admin/reports/midterm` shows `Exempt`
  - candidate rows offer `Mark exempt`
  - existing records can be marked exempt when not forwarded/locked
  - exempted tasks no longer appear in `/teacher/midterm-reports`

## Release

- Release line: `2026-04-03-r26`
- Status: `LIVE`
