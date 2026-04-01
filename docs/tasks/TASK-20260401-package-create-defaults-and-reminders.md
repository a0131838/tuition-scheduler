# TASK-20260401-package-create-defaults-and-reminders

## Summary
- Fine-tune the admin package-create flow so the default package type matches day-to-day usage and teaching staff get quick reminders about existing active packages.

## Scope
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/packages/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- change the default package type from the group-minutes option to `HOURS / 课时包`
- add quick minute presets for common package sizes
- show active-package and same-course reminders after selecting a student
- keep package creation API payload, validation rules, and ledger writes unchanged

## Validation
- `npm run build`

## Status
- Completed and deployed.
