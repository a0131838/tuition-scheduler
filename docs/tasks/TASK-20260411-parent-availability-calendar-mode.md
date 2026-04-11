# TASK-20260411-parent-availability-calendar-mode

## Goal

Let families submit available lesson times in two ways: the original weekly repeating template, or a calendar-style exact-date selection flow for the next few available days.

## Scope

- keep the existing weekly repeating template in `/availability/[token]`
- add a calendar-style exact-date mode for parent submissions
- store the new mode in the existing `payloadJson` structure without changing database schema
- show the selected mode and exact-date data in admin ticket and student summaries
- make scheduling-coordination preview matching respect exact-date submissions

## Non-Goals

- no teacher availability storage changes
- no quick schedule or session generation logic changes
- no package, deduction, or finance logic changes
- no deletion, archive, or permission changes

## Risks

- exact-date submissions can be missed if candidate-slot windows are still truncated too early
- public form must stay simple enough for parents while supporting two modes
- old weekly payloads must remain readable without migration

## Validation

- `npm run build`
- verify weekly mode still submits and renders as before
- verify exact-date mode stores specific date and time selections
- verify admin ticket and student views show the exact-date summary
- verify scheduling-coordination matching respects later exact dates instead of only early default candidates
