# TASK-20260403-final-report-exempt-phase-1

## Goal

Add an admin-only `EXEMPT / 无需报告` path to Final Reports so operations can remove no-report packages from the final-report workflow without assigning teachers first.

## Why

- Some completed packages do not need a final report at all.
- Assigning a teacher first and then marking the report unnecessary creates avoidable queue noise.
- Teachers should not continue seeing report tasks that operations already decided to exempt.

## Scope

- Add `EXEMPT` to `FinalReportStatus`
- Store exemption metadata on `FinalReport`
  - `exemptReason`
  - `exemptedAt`
  - `exemptedByUserId`
- Add admin `Mark exempt / 标记无需报告` from:
  - completed-package candidate rows
  - existing final-report records
- Add `Exempt` filter/count to the admin final-report center
- Hide exempted tasks from the teacher final-report list
- Prevent exempted teacher/package pairs from resurfacing in candidate assignment options

## Non-Goals

- No `Archive` status yet
- No midterm-report changes yet
- No changes to package completion rules, attendance, billing, finance, PDF generation, share-link logic, or parent delivery logic

## Risks

- This adds a Prisma enum/schema migration
- Admins could exempt the wrong report if reason selection is careless
- Candidate filtering must not suppress valid non-exempt teacher options

## Validation

- `npm run prisma:generate`
- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- production read-only QA confirms:
  - `/admin/reports/final` shows `Exempt`
  - candidate rows offer `Mark exempt`
  - existing records can be marked exempt when not delivered
  - exempted tasks no longer appear in `/teacher/final-reports`

## Release

- Release line: `2026-04-03-r25`
- Status: `LIVE`
