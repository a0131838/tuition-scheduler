# TASK-20260404-student-detail-section-open-state-pass

## Goal

Make student-detail section anchors and refresh-driven returns reopen the relevant workbench section instead of leaving operators at a closed block.

## Why

- The calendar month hotfix solved one specific collapse path.
- Other student-detail flows still depended on the hash alone, which does not reopen closed `<details>` sections after refresh.
- Operators could still land on `#packages`, `#attendance`, or `#edit-student` while the target block stayed closed.

## Scope

- Add a client-side student-detail hash watcher that reopens the matching `<details>` section on load and on hash changes
- Teach the shared student-detail hash restore helper to reopen the relevant section before scrolling
- Keep attendance clear/reset actions focused on the attendance section

## Non-Goals

- No changes to scheduling rules
- No changes to attendance, deduction, package, or billing logic
- No changes to student data editing behavior beyond section return UX

## Risks

- Low; this is a student-detail UI state and navigation pass only

## Validation

- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- operator click-through should confirm `Packages / Attendance / Edit Student` reopen when revisiting by hash after refresh

## Release

- Release line: `2026-04-04-r03`
- Status: `READY`
