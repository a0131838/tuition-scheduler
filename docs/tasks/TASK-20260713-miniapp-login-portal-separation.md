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
- Added low-priority portal switches to the authenticated student list and staff home so dual-role WeChat users are never trapped in one portal.
- Added release-audit and regression-test coverage for entry hierarchy, automatic binding, remembered portal, expired sessions, and authenticated switching.

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
