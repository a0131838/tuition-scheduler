# TASK-20260404-admin-nav-monthly-schedule-to-today

## Goal

Move `Monthly Schedule / 月课表总览` from the admin sidebar `Reports / 报表` group into `Today / 今天` so operators can reach the month schedule from the day-first navigation cluster.

## Scope

- Update the admin sidebar grouping in `app/admin/layout.tsx`
- Keep the route, permissions, and schedule/report functionality unchanged

## Non-Goals

- No changes to monthly schedule data or exports
- No changes to report calculations
- No changes to finance, teacher, or student workflows

## Risk Check

- Low risk: this is a sidebar information architecture adjustment only
- Main verification: make sure the link appears under `Today / 今天` and no longer appears under `Reports / 报表`

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- manual sidebar check on production

## Status

`LIVE`
