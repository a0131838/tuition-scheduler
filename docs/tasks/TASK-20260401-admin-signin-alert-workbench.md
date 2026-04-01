# TASK-20260401-admin-signin-alert-workbench

## Summary
- Make the admin sign-in alert page easier for teaching staff to scan by grouping mixed warning rows into one session-focused workbench card.

## Scope
- `app/admin/alerts/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- replace the wide mixed warning table with session cards that combine teacher-sign-in, student-sign-in, and feedback issues
- add quick-focus filters for `All open sessions`, `Urgent first`, `Attendance only`, and `Feedback only`
- move alert-threshold controls into a secondary collapsed settings block
- make the card next-step guidance clearer and calculate feedback overdue timing from the actual post-class feedback deadline

## Validation
- `npm run build`

## Status
- Completed and deployed.
