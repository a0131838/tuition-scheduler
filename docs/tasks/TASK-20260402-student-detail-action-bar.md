# TASK-20260402 Student Detail Action Bar

## Goal

Reduce context loss on the admin student detail page by adding a sticky action bar plus section return links, so operators can move between profile, packages, attendance, upcoming sessions, planning, and edit actions without rescanning the whole page.

## Scope

- `app/admin/students/[id]/page.tsx`
- release documentation updates for the same ship

## Changes

1. Sticky student workbench bar
- add a first-screen sticky action bar below the hero
- keep the bar focused on:
  - quick schedule
  - upcoming sessions
  - packages
  - attendance
  - enrollments
  - edit student
  - export student report
- show a short context hint based on package risk / unpaid status

2. Section anchors and return flow
- add stable anchors for:
  - `enrollments`
  - `packages`
  - `attendance`
  - `upcoming-sessions`
  - `quick-schedule`
  - `edit-student`
- add lightweight return bars inside each major section so operators can jump back to the sticky action bar or the next likely section

## Non-goals

- no student edit logic changes
- no quick-schedule submission logic changes
- no attendance filter logic changes
- no package data or billing logic changes
- no session cancel / restore / replace-teacher logic changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3322` confirmed:
  - the student detail page renders `Student workbench`
  - the page now exposes `Back to action bar`
  - `#enrollments`, `#quick-schedule`, and `#edit-student` anchors are present
  - the upcoming-sessions section shows the new return guidance copy

## Release notes

- Release ID: `2026-04-02-r19`
- Risk: low
- Rollback: revert this release if the sticky action bar obscures student detail content, if the new section-return links point to the wrong anchors, or if the student detail page layout becomes unstable on first load
