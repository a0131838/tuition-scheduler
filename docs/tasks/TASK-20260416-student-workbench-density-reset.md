# TASK-20260416-student-workbench-density-reset

## Why

The student detail workbench kept the old large card-wall layout even after the newer lightweight sticky shortcut work. That made the student page feel visually inconsistent, too dense, and oddly repetitive because the same navigation intent appeared both in the sticky shortcut row and in a heavy block of equal-weight cards.

## Scope

- simplify the student detail workbench block into a lighter structure
- keep the most common student actions as primary cards
- move the remaining destinations into lighter secondary links
- keep all existing student detail navigation targets and workflow logic unchanged

## Files

- `app/admin/students/[id]/page.tsx`
- `docs/tasks/TASK-20260416-student-workbench-density-reset.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production browser check:
  - student detail workbench is no longer a wall of equal-weight cards
  - the block now emphasizes a few primary actions with lighter secondary links
  - the sticky compact shortcut row still works above it

## Risk

Low. This is a student-detail UI-only cleanup. It keeps the same destinations and anchors, and does not change scheduling, packages, attendance, reporting, or edit logic.
