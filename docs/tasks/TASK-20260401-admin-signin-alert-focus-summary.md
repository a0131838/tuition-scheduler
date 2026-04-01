# TASK-20260401-admin-signin-alert-focus-summary

## Summary
- Make the admin sign-in alert summary cards match the current quick-focus filter so users do not think the page ignored their focus selection.

## Scope
- `app/admin/alerts/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- make the top summary cards use the same filtered queue as the current `All / Urgent / Attendance / Feedback` focus mode
- keep alert sync, thresholds, card grouping, and action links unchanged

## Validation
- `npm run build`

## Status
- Completed and deployed.
