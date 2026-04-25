# TASK-20260425 Todo Academic Alert Filter Counts

## Scope

- Fix Todo Center academic-management lane buttons so they do not reload the whole page.
- Make lane counts match the visible alert rows.
- Remove the 20-row cap from academic-management alerts.

## Real Data / Code Checked

- The old Todo Center pills used active-package student/package counts, while the section title used alert-row count.
- The old alert list was capped with `.slice(0, 20)`, so a lane could silently hide students.
- A global Todo Center scan found remaining `todoHref` links only for pagination and lazy conflict loading, which intentionally require server data.

## Implemented

- Added a client component for academic-management alert lane switching.
- The server now sends all academic alert rows once; the client filters rows instantly by lane.
- URL `academicLane` is updated with `history.replaceState` so links remain shareable without forcing a reload.
- Counts now reflect alert rows by lane.

## Out of Scope

- Changing the monthly academic report filter, which recalculates a report by month/lane.
- Changing scheduling, attendance, billing, settlement, contracts, payroll, or OpenClaw behavior.
