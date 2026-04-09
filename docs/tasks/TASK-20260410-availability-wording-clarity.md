# TASK-20260410-availability-wording-clarity

## Goal

Reduce operator and teacher confusion by making the availability wording explicit on both teacher and admin pages.

## Scope

- teacher availability hero and page guidance
- teacher availability inline notice
- admin teacher availability weekly-template wording
- release documentation

## Non-goals

- no scheduling rule changes
- no availability data migration
- no change to template generation behavior
- no finance, payroll, or permission logic changes

## Files

- `app/teacher/availability/page.tsx`
- `app/teacher/availability/TeacherAvailabilityClient.tsx`
- `app/admin/teachers/[id]/availability/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Notes

- teacher page should explicitly state that saved date slots are the actual schedulable source
- admin page should explicitly state that weekly templates are only used to generate month date slots
