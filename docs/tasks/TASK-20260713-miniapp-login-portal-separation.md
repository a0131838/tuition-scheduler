# TASK-20260713 Miniapp Login Portal Separation

## Goal

Make the first screen comfortable for parents while keeping employee access easy to find and avoiding three competing login/binding actions.

## Completed

- Made the default entry page parent-focused with one primary WeChat login action.
- Moved employees into a separate login page reached through a low-priority portal switch.
- Removed parent invite and employee binding-code buttons from the login pages.
- Preserved automatic routing to the correct binding form when WeChat login reports an unbound identity.
- Persisted the last-used parent/staff portal and resumed it when a valid session exists.
- Cleared expired local sessions before returning to the matching login page to prevent redirect loops.
- Kept the employee-side return to the parent portal for staff who also need to check a parent identity.
- Added release-audit and regression-test coverage for entry hierarchy, automatic binding, remembered portal, expired sessions, and portal separation.

## Follow-up Correction (`2026-07-13-r244`)

- Removed the employee-portal entry from the authenticated parent student page after Zhao confirmed it was still confusing inside the parent experience.
- The employee entry now exists only on the unauthenticated login screen; authenticated parent pages remain parent-only.
- The employee workbench still retains its return-to-parent action because it is inside the employee context and does not expose internal language to ordinary parents.

## Safety Boundaries

- No API, permission, database, student, package, schedule, finance, notification, or audit behavior changed.
- Parent and employee authentication remain separate and keep their existing tokens and backend checks.
- Invitation and employee binding are not removed; they now appear only after the relevant login flow determines binding is required, or from the existing authenticated add-student action.

## Verification

- [x] All native miniapp JavaScript syntax checks.
- [x] 17 focused login, scheduling, feedback-notification, and teacher-workbench tests.
- [x] 26-page native-miniapp release audit with zero errors.
- [x] TypeScript.
- [x] Full 192-page production build.
- [x] WeChat DevTools visual check on iPhone 12/13 for parent login, employee portal navigation, employee login, and return to parent.
- [ ] Upload the next WeChat experience version and confirm the remembered-portal behavior on a physical phone.
