# TASK-20260713 Miniapp UI, Search And Brand Refresh

## Goal

Make the parent and staff miniapp feel like a finished Boss Education product, remove internal rollout wording, and ensure every visible search entry behaves predictably.

## Completed

- Added the official Boss/GTIA logo to parent and employee login.
- Standardized navigation, tabs, primary actions, active states, inputs, cards, metrics, and status colors around logo orange, charcoal, white, and cool gray.
- Simplified visible copy across parent, staff, scheduling, request, reminder, and teacher pages.
- Removed visible wording about travel, high-frequency rollout, first-version scope, mobile workbenches, and internal English role names.
- Replaced the staff-home card stack with scan-friendly divider rows.
- Standardized all three staff searches: student scheduling, scheduling coordination, and assisted-ticket student lookup.
- Added debounce, explicit query, keyboard confirmation, clear controls, loading text, and stale-response protection.
- Added release-audit checks for brand color, logo presence, forbidden rollout copy, standard search controls, and stale-request protection.

## Safety Boundaries

- No API contract or permission change.
- No database migration.
- No scheduling, attendance, package, finance, payroll, notification, or audit-log behavior change.
- Existing green/red colors remain only where they communicate status.

## Verification

- [x] All miniapp JavaScript syntax checks.
- [x] All tracked miniapp JSON parsing checks.
- [x] 26-page miniapp release audit with zero errors.
- [x] 11 focused scheduling and teacher tests.
- [x] TypeScript.
- [x] Full 192-page production build.
- [x] WeChat DevTools compile with 0 errors and 0 warnings.
- [x] Parent login visual check for official logo and palette.
- [ ] Experience-version physical-phone regression for query, keyboard search, clear, rapid query replacement, and empty results on all three search pages.

## Upload Note

This is a native miniapp package change. A normal server deployment does not publish the new screens to WeChat users; after the outstanding ready releases are deployed in order, upload a new WeChat experience version and complete the physical-phone checklist before submitting for review.
