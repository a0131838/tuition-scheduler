# TASK-20260409-date-only-scheduling-availability

## Goal

Make teacher weekly templates a generation-only tool and ensure all real scheduling logic uses only date-based availability.

## Scope

- quick schedule
- class session create / generate / reschedule / replace teacher
- student session replace teacher
- appointment create / replace teacher
- ops execution actions that create or move lessons
- booking candidate generation
- teacher availability admin wording
- release documentation

## Non-goals

- no database schema change
- no change to how weekly templates are stored
- no change to session conflict detection rules
- no change to attendance, package, payroll, or finance logic

## Files

- `lib/teacher-scheduling-availability.ts`
- `app/admin/students/[id]/page.tsx`
- `app/admin/schedule/page.tsx`
- `app/admin/classes/[id]/sessions/page.tsx`
- `app/admin/teachers/[id]/availability/AdminTeacherAvailabilityClient.tsx`
- `app/admin/teachers/[id]/availability/page.tsx`
- `app/api/admin/students/[id]/quick-appointment/route.ts`
- `app/api/admin/classes/[id]/sessions/route.ts`
- `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
- `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
- `app/api/admin/classes/[id]/sessions/replace-teacher/route.ts`
- `app/api/admin/students/[id]/sessions/replace-teacher/route.ts`
- `app/api/admin/sessions/[id]/replace-teacher/route.ts`
- `app/api/admin/appointments/route.ts`
- `app/api/admin/appointments/[id]/replace-teacher/route.ts`
- `app/api/admin/ops/execute/route.ts`
- `app/api/admin/booking-links/candidates/route.ts`
- `lib/booking.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Notes

- weekly template should remain available for batch-generating a month's date rows
- if a day has no date availability, scheduling must reject it even if the weekday template contains a matching slot
- teacher monthly availability UI should state that real scheduling uses only date rows
