# TASK-20260331 Student Full List Count Fix

## Goal
- Fix the admin students page so `Full List / 完整列表` shows the real total student count instead of the active filtered-view count.

## Scope
- `app/admin/students/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Display-only fix.
- No student data mutation.
- No filter rule or pagination query change beyond correcting which count each label uses.

## Validation
1. `npm run build` passes.
2. `Full List / 完整列表` shows the real total student count.
3. `Showing x / y` still reflects the active filtered view.

## Status
- Completed and ready for deploy.
