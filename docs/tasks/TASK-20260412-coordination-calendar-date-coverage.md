# TASK-20260412-coordination-calendar-date-coverage

## Goal

Make scheduling-coordination helper shortlists cover more of the parent's selected calendar dates instead of letting the earliest matching date consume most of the visible slots.

## Scope

- keep the existing parent calendar-date matching rules unchanged
- keep the existing teacher-availability search and slot filtering unchanged
- change only the prioritization step after matches are found
- for calendar-mode payloads, rotate through requested dates so the first shortlist includes broader date coverage before repeating the same date
- keep student detail and ticket detail on the shared helper path so both pages show the same improved shortlist behavior

## Non-Goals

- no schema change
- no parent form payload change
- no teacher availability storage change
- no quick schedule rewrite
- no package, deduction, or finance logic change

## Risks

- helper slot order will change for calendar-mode coordination items, which may surprise ops users who were used to pure chronological sorting
- dates that truly have no matching teacher availability will still remain absent, so this improves coverage only when real matches already exist

## Validation

- `npm run build`
- verify calendar-mode parent submissions with several matched dates now show a more date-balanced first shortlist
- verify the underlying matched slot pool is unchanged and only the visible prioritization order changes
- verify the known example ticket `20260409-004` now surfaces `2026-04-11`, `2026-04-13`, `2026-04-19`, and `2026-04-20` within the first five generated options
