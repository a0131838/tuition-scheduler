# TASK-20260404-student-detail-edit-id-collision-hotfix

## Goal

Remove the remaining student-detail `edit-student` id collision so explicit `focus=edit-student` and hash returns target the real edit `<details>` block.

## Why

- QA after `r05` showed `focus=edit-student#edit-student` still landing on a non-open element.
- The page still rendered two different nodes with `id="edit-student"`: an outer wrapper `<div>` and the actual edit `<details>` block.
- Hash returns and DOM checks were still hitting the wrapper instead of the real expandable edit section.

## Scope

- Rename the outer student-detail edit wrapper to a non-conflicting id
- Keep the actual edit `<details id="edit-student">` as the sole target for edit return flows

## Non-Goals

- No changes to student save/delete logic
- No changes to scheduling, attendance, deduction, package, or billing rules
- No new student-detail business actions

## Risks

- Low; this is a DOM id-collision hotfix only

## Validation

- `npm run build`
- targeted QA should confirm `focus=edit-student#edit-student` hits the real edit details block and leaves it open
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`

## Release

- Release line: `2026-04-04-r06`
- Status: `READY`
