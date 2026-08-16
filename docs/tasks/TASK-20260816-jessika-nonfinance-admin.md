# TASK-20260816-jessika-nonfinance-admin

## Context

Jessika is now a full-time employee in addition to teaching. She needs to manage teachers, students, schedules, tickets, communication and training from the normal Admin workspace, but company finance must remain inaccessible. Her existing teacher account and Staff Mini Program binding must be preserved.

## Change

- Added a dedicated `OperationsAdminAcl` without changing Jessika's primary `TEACHER` role or teacher-profile link.
- Added signed Web sessions and an explicit operations route allowlist so finance is rejected server-side rather than only hidden in navigation.
- Kept the standard Admin home and sidebar while omitting finance widgets, finance groups and mixed finance work queues.
- Enabled academic and scheduling work in the Staff Mini Program while denying manager approvals and renewals.
- Mapped AI SSO to `ACADEMIC`.
- Added an owner-only access-control switch and audit logging for future operations-admin changes.
- The release migration activates the ACL for `sym.sweyeemon@gmail.com` and invalidates existing Web sessions so the new boundary applies on the next login.

## Non-goals

- No duplicate Jessika account or new password is created.
- No scheduling, attendance, deduction, package balance, invoice, receipt, payroll, expense, renewal or settlement business rule is changed.
- Jessika's own teacher portal and personal teacher records remain available.

## Verification

- `npm run prisma:generate`
- `npx tsc --noEmit`
- `npx tsx --test tests/operations-admin-access.test.ts tests/observer-access.test.ts tests/teacher-lead-scope.test.ts tests/route-guards.test.ts tests/miniapp-action-center.test.ts tests/monthly-scheduling-access.test.ts tests/miniapp-staff-schedule-calendar.test.ts`
- `npm run build`
- `git diff --check`

## Risk

Medium because this adds cross-channel authorization. The risk is contained through a signed restricted session, a default-deny finance route policy, explicit miniapp approval/renewal denial, session invalidation, owner-only ACL changes and focused permission regression tests.
