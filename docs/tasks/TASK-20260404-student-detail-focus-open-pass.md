# TASK-20260404-student-detail-focus-open-pass

## Goal

Teach student-detail sections to honor explicit `focus` state on first render so package, enrollment, quick-schedule, and edit flows open in the right place without waiting for client hash recovery.

## Why

- The hash restore layer now reopens closed sections after refresh.
- Some student-detail blocks still rendered closed on the initial server pass even when the operator had clearly returned to that section.
- Operators should land with the correct section already open whenever the URL carries explicit section intent.

## Scope

- Open `calendar-tools`, `enrollments`, `packages`, and `edit-student` from `focus=...` query state
- Keep quick schedule open when the return state explicitly points back to that work area
- Preserve the attendance reset return inside the attendance section

## Non-Goals

- No changes to scheduling rules
- No changes to attendance, deduction, package, or billing logic
- No new student-detail business actions

## Risks

- Low; this is a student-detail first-render state refinement only

## Validation

- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- operator click-through should confirm explicit `focus` returns open `Packages / Enrollments / Quick Schedule / Edit Student` on first render

## Release

- Release line: `2026-04-04-r04`
- Status: `READY`
