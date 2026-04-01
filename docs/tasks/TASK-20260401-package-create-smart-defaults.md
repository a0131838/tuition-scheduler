# TASK-20260401-package-create-smart-defaults

## Summary
- Add smarter course-based defaults and a stronger duplicate-package warning to the admin package-create flow so teaching staff can move faster without missing duplicate active packages.

## Scope
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/packages/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- derive a suggested minute balance from recent `HOURS / 课时包` records for the selected course
- auto-fill that suggested balance until staff manually change the minute field
- add a stronger yellow warning on the final review step when the selected student already has active packages for the same course
- keep package creation API payload, validation rules, and ledger writes unchanged

## Validation
- `npm run build`

## Status
- Completed and deployed.
