# TASK-20260417-student-workbench-scheduling-priority-and-remaining-hours

## Why

After the student workbench recommendation pass, ops feedback clarified two stronger priorities: quick scheduling tools and the schedule calendar are the most frequent teaching-ops entry points, and remaining lesson hours are also critical because they affect whether scheduling should continue normally. The student detail workbench should reflect those real usage priorities.

## Scope

- keep quick schedule and quick schedule calendar as always-prominent student-detail actions
- keep package access prominent when billing or package follow-up is active
- surface remaining lesson hours earlier in the student detail summary area
- preserve the recommended-first-action pattern without hiding the most-used scheduling tools
- keep workflow logic, anchors, and destinations unchanged

## Files

- `app/admin/students/[id]/page.tsx`
- `docs/tasks/TASK-20260417-student-workbench-scheduling-priority-and-remaining-hours.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production browser check:
  - student detail keeps quick schedule and quick schedule calendar prominent
  - remaining lesson hours are visible before entering the packages section
  - package entry stays prominent when package/billing follow-up is active
  - recommended-first-action behavior still works

## Risk

Low. This is UI-only on student detail. It does not change package math, scheduling logic, attendance logic, or any routing behavior; it only changes which existing entry points stay prominent and where remaining hours are surfaced.
