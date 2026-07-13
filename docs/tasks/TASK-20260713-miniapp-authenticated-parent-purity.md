# TASK-20260713 Miniapp Authenticated Parent Purity

## Goal

Keep the authenticated parent experience strictly parent-facing after the login journeys were separated.

## Completed

- Removed `进入博思员工端` from the authenticated student-selection page.
- Removed the unused parent-page employee navigation handler.
- Kept employee access on the unauthenticated login page, where users choose the correct portal before signing in.
- Kept `切换到家长端` inside the employee workbench for staff members who also have a parent identity.
- Added regression coverage that rejects employee-entry wording and navigation from the authenticated parent page.

## Safety Boundaries

- No login endpoint, token, permission, binding, database, student, schedule, package, finance, or notification behavior changed.
- Parent auto-login and employee auto-login continue to use the remembered portal and their separate stored sessions.

## Verification

- [x] Native miniapp JavaScript syntax checks.
- [x] 17 focused login, scheduling, feedback-notification, and teacher-workbench tests.
- [x] 26-page native-miniapp release audit with a guard that rejects employee entry from authenticated parent pages.
- [x] TypeScript.
- [x] Full 192-page production build.
- [x] WeChat DevTools recompiled the current package and successfully navigated from the employee workbench back to the parent login journey.
