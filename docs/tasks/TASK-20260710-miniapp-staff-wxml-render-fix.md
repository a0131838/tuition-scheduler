# TASK-20260710-miniapp-staff-wxml-render-fix

## Context

The WeChat Developer Tool showed `pages/staff-home/staff-home` with only the navigation bar and a blank content area after the staff miniapp schedule and feedback pages were added. The staff WXML pages still contained complex fallback expressions such as `{{a || b}}`, comparison expressions, and boolean combinations.

## Change

- Removed complex WXML fallback expressions from staff miniapp pages.
- Added precomputed display fields in page JavaScript for staff home, schedule, request list, request detail, and session feedback detail.
- Made staff-home loading non-blocking so employee action cards render before optional count APIs complete.
- Added explicit miniapp request timeout support and removed unused `scope.writePhotosAlbum` permission from `app.json`.
- Kept the same UI structure and backend API calls.

## Non-goals

- Did not change staff authentication.
- Did not change schedule APIs, parent request APIs, or feedback write APIs.
- Did not change scheduling, attendance deduction, package ledger, billing, payroll, partner settlement, or OpenClaw behavior.

## Verification

- Staff WXML expression scan confirmed no remaining `||`, `&&`, or `===` expressions in staff pages.
- Miniapp JavaScript syntax check passed.
- Miniapp JSON parse check passed.
- Staff home no longer depends on `Promise.all` for all dashboard APIs before rendering counts.

## Risk

Low. This is a native miniapp rendering compatibility change only. It moves display fallback logic from WXML into page JavaScript and does not change backend behavior.
