# TASK-20260404-student-detail-calendar-open-hotfix

## Goal

Keep the student-detail `Planning tools & calendar / 排课工具与日历` section expanded when operators switch months inside the calendar.

## Why

- The previous section-return fix preserved the `#calendar-tools` hash.
- Month navigation still caused the `<details>` block to collapse after reload.
- Operations then had to reopen the calendar manually before continuing schedule work.

## Scope

- Add a dedicated `calendarOpen=1` query flag on student-detail calendar month navigation
- Treat `calendarOpen=1` as an expanded state for the calendar `<details>` block

## Non-Goals

- No changes to quick scheduling logic
- No changes to attendance, deduction, package, or billing behavior
- No changes to other student-detail section-return logic

## Risks

- Very low; this is a view-state hotfix on one page

## Validation

- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- production read-only QA should confirm clicking `Prev Month / Next Month` keeps `Planning tools & calendar` expanded

## Release

- Release line: `2026-04-04-r02`
- Status: `READY`
