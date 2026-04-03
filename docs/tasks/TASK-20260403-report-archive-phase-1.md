# TASK-20260403-report-archive-phase-1

## Goal

Add an admin-only `Archive / 归档` path to Midterm Reports and Final Reports so completed or exempt report records can leave the active desks without losing audit history.

## Why

- `Exempt` means a report was not required; it should stay distinct from ordinary historical cleanup.
- Delivered or forwarded reports can crowd the active workbench even when no follow-up is needed.
- Operations still need a recoverable audit trail and the ability to restore a report if it was archived too early.

## Scope

- Add archive metadata to `MidtermReport`
  - `archivedAt`
  - `archivedByUserId`
- Add archive metadata to `FinalReport`
  - `archivedAt`
  - `archivedByUserId`
- Add admin `Archive / 归档` and `Restore / 恢复`
  - midterm: forwarded/locked or exempt reports only
  - final: delivered or exempt reports only
- Add `Archived` filter/count to both admin report centers
- Hide archived tasks from teacher midterm/final lists
- Block teacher report detail pages from opening archived items
- Keep archived teacher/package pairs out of candidate assignment options

## Non-Goals

- No changes to report content fields
- No changes to teacher submit/forwarded logic
- No changes to final-report delivery/share semantics other than revoking active share links when a final report is archived
- No attendance, package, billing, or finance changes

## Risks

- This adds a Prisma schema migration
- Archive/restore actions must not hide still-active reports
- Candidate filtering must keep already-completed history out of assign queues without blocking valid future work

## Validation

- `npm run prisma:generate`
- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- production read-only QA confirms:
  - `/admin/reports/final` shows `Archived`
  - `/admin/reports/midterm` shows `Archived`
  - teacher `/teacher/final-reports` and `/teacher/midterm-reports` continue loading without archived items in the active list

## Release

- Release line: `2026-04-03-r27`
- Status: `LIVE`
