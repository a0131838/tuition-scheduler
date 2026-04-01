# TASK-20260401-package-create-minute-patterns

## Summary
- Align package-create minute presets and fallback defaults with the teaching office's real package patterns, including 10h / 20h / 40h / 100h regular packages and 45-minute lesson bundles for New Oriental partner students.

## Scope
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/packages/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- show 10h / 20h / 40h / 100h quick presets for regular package creation
- detect New Oriental partner students and show 45-minute lesson presets (6 / 8 / 10 / 20 / 40 lessons)
- keep course-based suggestion logic, but make fallback defaults follow the more realistic package pattern for the selected student context

## Validation
- `npm run build`

## Status
- Completed and deployed.
