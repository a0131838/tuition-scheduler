# TASK-20260326 Backend Integrity Hardening

## Goal
- Reduce duplicate-submit, stale-update, and data-consistency risks in backend scheduling and availability flows.
- Add enough regression coverage and audit tooling to make follow-up deploys safer.

## Scope
- `app/api/admin/students/[id]/quick-appointment/route.ts`
- `app/api/admin/ops/execute/route.ts`
- `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
- `app/api/admin/teachers/[id]/generate-sessions/route.ts`
- `app/api/admin/classes/[id]/sessions/route.ts`
- `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`
- `app/api/admin/packages/[id]/top-up/route.ts`
- `app/api/admin/teachers/[id]/availability/date/route.ts`
- `app/api/admin/teachers/[id]/availability/weekly/route.ts`
- `app/api/admin/teachers/[id]/availability/generate-month/route.ts`
- `app/api/teacher/availability/slots/route.ts`
- `app/api/teacher/availability/bulk/route.ts`
- `app/api/teacher/availability/undo/route.ts`
- `lib/expense-claims.ts`
- `lib/admin-teacher-availability.ts`
- `lib/availability-conflict.ts`
- `lib/package-top-up.ts`
- `lib/quick-schedule-execution.ts`
- `lib/session-unique.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260326183000_add_session_unique_schedule_guard/migration.sql`
- `prisma/migrations/20260326195000_add_availability_unique_guards/migration.sql`
- `scripts/report-availability-integrity.ts`
- `scripts/clean-availability-integrity.ts`
- `tests/admin-teacher-availability.test.ts`
- `tests/availability-conflict.test.ts`
- `tests/expense-claims.test.ts`
- `tests/package-top-up.test.ts`
- `tests/quick-schedule-execution.test.ts`
- `tests/session-unique.test.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Keep existing business rules intact; changes should only harden atomicity, duplicate prevention, and overlap validation.
- `Session` uniqueness is enforced at DB level for exact duplicate sessions only.
- Availability cleanup intentionally merges overlapping ranges but does not merge merely adjacent ranges.
- Availability cleanup is a live data operation and must be followed by a post-clean audit.

## Validation
1. `npm run test:backend` passes.
2. `npm run build` passes.
3. `npm run audit:availability-integrity` reports zero duplicate and zero overlap groups after cleanup.
4. `npx prisma migrate deploy` applies both `20260326183000_add_session_unique_schedule_guard` and `20260326195000_add_availability_unique_guards`.
5. Scheduling duplicate writes now surface as controlled conflicts instead of silent duplicates.

## Status
- Completed locally and on the production database; ready for deploy/doc sync.
