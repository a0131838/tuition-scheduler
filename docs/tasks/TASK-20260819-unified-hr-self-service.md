# TASK-20260819 Unified HR Self-Service

## Context

Personal HR was previously mounted separately under the admin and teacher portals. Finance employees were blocked by admin route restrictions, while HR managers without an employee profile could see a personal link that redirected to an error. The HR setup forms also competed for width on one always-open page.

## Change

- Added `/staff/hr` as the single web self-service route for every employee profile.
- Pointed admin and teacher navigation to the same route and retained redirects from the legacy URLs.
- Showed the personal HR navigation entry only when the signed-in account has an employee profile.
- Extended observer and restricted-operations middleware protection to the shared staff route.
- Added Zhao Hongwei as a full-time employee from 2023-08-23 with Jasmine as approver through the existing idempotent bootstrap.
- Collapsed infrequent HR setup forms and made all setup controls responsive.

## Non-goals

- No leave entitlement, duration or approval calculation changed.
- No payslip amount, finance, attendance, package, contract, scheduling or teacher-payroll record changed.
- The staff Mini Program continues using the existing shared HR API and needs no package upload for this server-only release.

## Verification

- `npx tsx --test tests/hris.test.ts tests/operations-admin-access.test.ts tests/route-guards.test.ts`
- `npm run build`
- `git diff --check`

## Risk

Low to medium. The visible change is navigation and responsive presentation. The production data change is an idempotent upsert for one confirmed employee profile, with no historical transaction rewrite.
