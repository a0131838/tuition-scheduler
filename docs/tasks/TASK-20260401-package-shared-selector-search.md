# TASK-20260401-package-shared-selector-search

## Summary
- Replace hard-to-scan shared student and shared course multi-selects with searchable add/remove pickers in package create and edit flows.

## Scope
- `app/admin/_components/SearchableMultiSelect.tsx`
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/_components/PackageEditModal.tsx`
- `app/admin/packages/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- add a reusable searchable multi-select that adds selected items as removable tags
- use the new searchable picker for `Shared Students / 共享学生` and `Shared Courses / 共享课程` in both create and edit package flows
- exclude the current student and current course from their own sharing candidates
- show source and active-package context in shared-student search results to reduce similar-name mistakes

## Validation
- `npm run build`

## Status
- Completed and deployed.
