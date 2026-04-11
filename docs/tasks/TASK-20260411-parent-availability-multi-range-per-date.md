# TASK-20260411-parent-availability-multi-range-per-date

## Goal

Let families add more than one available time range to the same exact calendar date in the parent-availability form.

## Scope

- keep the existing weekly repeating template unchanged
- keep the existing exact-date mode and extend it so one selected date can hold multiple time ranges
- preserve the current flat `dateSelections[]` payload structure by allowing repeated dates
- keep admin summary text readable when one date contains multiple time ranges

## Non-Goals

- no multi-course combined form in this task
- no database schema change
- no teacher availability storage or scheduling rule change
- no quick schedule, session, package, deduction, or finance logic change

## Risks

- public calendar-mode UI can become cluttered if extra ranges are not visually constrained
- parsing must stay backward-compatible with older single-range exact-date submissions
- repeated dates must stay readable in admin summaries

## Validation

- `npm run build`
- verify calendar-date mode allows adding up to three time ranges on the same date
- verify removing an extra range does not break the selected date
- verify submitted calendar-mode payload still uses flat `dateSelections[]`
- verify grouped summary text shows one date followed by all ranges for that date
