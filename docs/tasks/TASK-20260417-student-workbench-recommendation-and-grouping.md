# TASK-20260417-student-workbench-recommendation-and-grouping

## Why

The student detail workbench was already less dense than before, but it still left too much decision work to the user. The next pass should make the page clearly say what to do first, keep primary actions short, group secondary actions, and align the lower workbench block with the lightweight sticky jump row above it.

## Scope

- add a dynamic recommended first action on student detail
- shorten main action copy into faster one-line guidance
- split secondary links into grouped sections
- clarify the relationship between the sticky jump row and the lower action block
- reduce visual density further without changing destinations or workflow logic

## Files

- `app/admin/students/[id]/page.tsx`
- `docs/tasks/TASK-20260417-student-workbench-recommendation-and-grouping.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production browser check:
  - student detail shows one recommended first action based on current state
  - supporting main actions use shorter copy
  - secondary links are grouped into learning follow-up and profile/export actions
  - the block explains that the sticky row above is for jumping while the lower block is for choosing the next action

## Risk

Low. This is UI-only on student detail. It does not change scheduling, package, attendance, coordination, reporting, or edit behavior; it only changes how those entry points are presented.
