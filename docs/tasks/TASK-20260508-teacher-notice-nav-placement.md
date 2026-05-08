# TASK-20260508-teacher-notice-nav-placement

## Context

The teacher notice center was deployed, but the admin sidebar entry was too low in the navigation, so it was easy to miss.

## Scope

- Move `Teacher Notices / 老师通知` into the top `Today / 今天` group for admin users.
- Move the same entry into the top finance `Today / 今天` group for finance users.
- Remove the duplicate lower placement from approval/finance queue groups.

## Verification

- `npm run build`

## Deployment

- Status: ready for deploy.
