# TASK-20260409-scheduling-coordination-slot-cards-and-quick-schedule-bridge

## Goal

Make the student-detail scheduling coordination helper feel actionable instead of read-only by:

- rendering generated slots as clear action cards
- letting ops jump straight into `Quick Schedule` with the same time already filled
- carrying the suggested teacher into `Quick Schedule` so that teacher floats to the top of the candidate list

## Scope

- Student detail scheduling coordination cards
- Quick Schedule teacher carry-over
- Release documentation

## Non-goals

- No changes to teacher availability rules
- No changes to session creation APIs
- No changes to booking links
- No changes to attendance, package, payroll, or finance logic

## Files

- `app/admin/students/[id]/page.tsx`
- `app/admin/_components/QuickScheduleModal.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Notes

- Generated slots, matched special requests, and alternative slots should all use the same card pattern.
- If the system cannot infer enough context to fully prefill `Quick Schedule`, the card should still open the modal and explicitly warn ops that one more campus/subject confirmation is needed.
- Suggested teacher carry-over should never auto-schedule; it should only reduce manual lookup by surfacing that teacher first.
