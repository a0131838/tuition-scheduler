# TASK-20260409-availability-weekly-fallback-clarity

## Goal

Make teacher availability easier for ops to understand so the system no longer looks like it is "force scheduling" when a teacher is actually schedulable through the weekly template fallback.

## Scope

- teacher monthly availability page
- quick schedule teacher candidate status wording
- release documentation

## Non-goals

- no change to the real availability rules
- no change to session creation APIs
- no change to conflict detection
- no change to attendance, package, payroll, or finance logic

## Files

- `app/admin/teachers/[id]/availability/AdminTeacherAvailabilityClient.tsx`
- `app/admin/teachers/[id]/availability/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/_components/QuickScheduleModal.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Notes

- monthly date cells should distinguish between "no date override" and "truly no slots"
- when a day is schedulable only because of the weekly template, that fallback should be visible directly in the day cell
- quick schedule should tell ops whether a candidate is available from a date override or from the weekly template fallback
