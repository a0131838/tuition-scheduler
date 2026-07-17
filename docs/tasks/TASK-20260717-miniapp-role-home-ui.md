# TASK-20260717-miniapp-role-home-ui

## Context

The native miniapp already supported parent service visibility, staff scheduling, teacher tools and request handling, but the employee home treated most roles as the same list of links. The user requested a more usable UI for academic staff, managers, teachers and parents while explicitly keeping the web system unchanged.

## Change

- Added a shared restrained visual system for the native miniapp: warm canvas, stronger typography, consistent radii, calmer surfaces and lightweight entrance/press feedback.
- Redesigned the employee home as a role-aware workspace.
- ADMIN now sees overdue scheduling and reminder exceptions first.
- CS now sees parent requests, scheduling workload and students needing attention first.
- TEACHER now sees the next lesson first and can open the existing lesson detail directly.
- Refined the parent-home visual hierarchy without changing its permission-aware data or navigation behavior.
- Added focused regression tests and a long-term miniapp UI plan.

## Non-goals

- No `app/admin/**` or other web-page change.
- No API, database, role, permission or business-write change.
- No scheduling, attendance, package, payroll, settlement, invoice or receipt change.
- This is the first UI batch; remaining list, detail and form pages stay scheduled for later batches.

## Verification

- `node --check miniapp/boss-academic-parent/pages/staff-home/staff-home.js`
- `npx tsx --test tests/miniapp-role-home-ui.test.ts tests/miniapp-login-entry.test.ts tests/miniapp-staff-schedule-calendar.test.ts` — 11/11 passed.
- `npm run miniapp:audit-release` — 30 pages, zero errors.
- All native-miniapp JavaScript syntax checks passed.
- All miniapp/WeChat tests passed — 44/44.
- `npm run test:backend` passed — 79/79.
- `npx tsc --noEmit` passed.
- `npm run build` passed — 194 pages.
- WeChat Developer Tools preview compiled successfully for AppID `wxe7017f8545e8ad49`; final package size was 345.8 KB. The first preview attempt used a relative project path and was rejected before compilation; the absolute project path succeeded.
- Guarded deploy, WeChat development upload and physical-phone role checks are recorded before release completion.

## Risk

Low-to-medium presentation risk limited to the native miniapp. The global visual tokens affect all native pages, so physical-phone checks must cover representative parent, teacher, academic and manager accounts before formal WeChat review.
