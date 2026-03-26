# TASK-20260326 Group Package Alignment

## Goal
- Make group package matching consistent across enrollment preview, enrollment submit, attendance default package ordering, and student balance preview.
- Prefer new `GROUP_MINUTES` packages for group classes while preserving legacy `GROUP_COUNT` fallback.

## Scope
- `lib/package-mode.ts`
- `app/api/admin/classes/[id]/enrollment-preview/route.ts`
- `app/api/admin/enrollments/route.ts`
- `app/api/admin/students/[id]/package-balance-preview/route.ts`
- `app/admin/sessions/[id]/attendance/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Group-class package selection and preview behavior only.
- No change to 1-on-1 package rules.
- No schema migration.
- No historical package conversion.

## Validation
1. `npm run build` passes.
2. Group enrollment preview and actual enrollment both prefer `GROUP_MINUTES`, then fall back to `GROUP_COUNT`.
3. Attendance page package ordering matches the same rule.
4. Legacy `GROUP_COUNT` balance preview uses count-style threshold instead of minute-duration threshold.

## Status
- Completed locally; ready for deploy/doc sync.
