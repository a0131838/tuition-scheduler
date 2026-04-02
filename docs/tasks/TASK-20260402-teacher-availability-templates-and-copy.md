# TASK-20260402 Teacher Availability Templates And Copy

## Goal

Reduce repetitive setup on the teacher availability page by adding reusable templates plus lightweight date-copy actions, so teachers can fill common schedules faster without changing availability business rules.

## Scope

- `app/teacher/availability/TeacherAvailabilityClient.tsx`
- release documentation updates for the same ship

## Changes

1. Common templates
- add a `Common templates` block above the existing forms
- provide preset loaders for:
  - weekday after school
  - weekday evening
  - weekend morning
  - weekend afternoon
- let each preset load into either:
  - quick add
  - bulk add

2. Quick copy by date
- add a `Quick Copy by Date` form
- allow copying all slots from one day to another day
- skip overlaps on the target day instead of changing or deleting existing slots

3. Calendar-level fast copy
- add one-click `Copy +1d` and `Copy +7d` actions for calendar days that already have slots
- keep the existing edit, delete, add-slot, clear-day, and undo actions intact

## Non-goals

- no new availability business rules
- no availability overlap-rule changes
- no clear-day or undo rule changes
- no server-side template persistence

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3323` confirmed:
  - `/teacher/availability` renders `Common templates`
  - the page renders `Quick Copy by Date`
  - the calendar exposes `Copy +1d` and `Copy +7d`
  - weekday preset labels render on first load

## Release notes

- Release ID: `2026-04-02-r20`
- Risk: low
- Rollback: revert this release if the new template buttons stop the existing quick-add or bulk-add forms from working, if copy actions produce unstable UI state, or if the calendar cell actions become confusing or unusable on first load
