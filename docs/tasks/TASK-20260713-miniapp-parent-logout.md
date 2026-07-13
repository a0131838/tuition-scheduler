# TASK-20260713 Miniapp Parent Logout

## Goal

Give authenticated parents a clear and safe way to leave the parent portal.

## Completed

- Added `退出家长登录` at the bottom of the authenticated student-selection page.
- Added a confirmation dialog so the parent cannot sign out accidentally.
- Reused the existing `POST /api/miniapp/auth/logout` endpoint to invalidate the current server session.
- Cleared the local parent token, selected student ID/name, and remembered portal state before returning to the parent login page.
- Kept all employee-entry wording out of the authenticated parent experience.
- Added regression and release-audit coverage for the visible action, server logout call, and local student cleanup.

## Safety Boundaries

- No authentication endpoint, schema, permission, binding, student, schedule, package, finance, notification, or employee-login behavior changed.
- A network failure cannot trap the parent in a stale local session: local credentials are still cleared after the logout attempt.
- Logging out of the parent portal does not delete the employee token for the same WeChat account.

## Verification

- [x] Native miniapp JavaScript syntax checks.
- [x] 18 focused login, logout, scheduling, feedback-notification, and teacher-workbench tests, including an executed logout-flow simulation.
- [x] 26-page native-miniapp release audit.
- [x] TypeScript after the production build regenerated `.next/types`.
- [x] Full 192-page production build.
- [ ] Physical-phone confirmation of the logout dialog and return to the parent login page after uploading the latest experience version.
