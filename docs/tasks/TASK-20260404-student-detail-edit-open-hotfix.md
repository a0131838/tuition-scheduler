# TASK-20260404-student-detail-edit-open-hotfix

## Goal

Keep `Edit Student / 编辑学生` open when student-detail returns with explicit `focus=edit-student`.

## Why

- The broader student-detail focus-open pass fixed packages, enrollments, calendar, quick schedule, and attendance.
- QA still found one gap: the client-side `Edit Student` details block could stay closed even when the URL explicitly returned to `focus=edit-student#edit-student`.
- Operators should land directly inside the edit section instead of rescanning the whole student page again.

## Scope

- Add a client-side open-state fallback for `Edit Student / 编辑学生` when `initialOpen` is true
- Keep the existing `focus=edit-student` first-render path intact

## Non-Goals

- No changes to student save/delete logic
- No changes to scheduling, attendance, deduction, package, or billing rules
- No new student-detail business actions

## Risks

- Low; this is a client-side details-open hotfix only

## Validation

- `npm run build`
- targeted QA should confirm `focus=edit-student#edit-student` leaves the edit block open
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`

## Release

- Release line: `2026-04-04-r05`
- Status: `LIVE`
