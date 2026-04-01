# TASK-20260401-package-edit-topup-followup-polish

## Summary
- Further reduce package edit and top-up mistakes by hiding less-common edit fields, making paid fields conditional, and showing a stronger human confirmation before top-up submission.

## Scope
- `app/admin/_components/PackageEditModal.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- move less-common edit fields into a collapsed advanced block
- only show paid-related edit fields when staff explicitly mark the package as paid
- add a clearer human-readable top-up confirmation sentence with student, course, and before/after balance values

## Validation
- `npm run build`

## Status
- Completed and deployed.
