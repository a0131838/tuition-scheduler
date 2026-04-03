# TASK-20260404-student-detail-section-return-fix

## Goal

Fix the admin student detail page so section-level actions return the user to the section they were working in instead of dropping them back at the top of the page.

## Why

- Operations use the student detail page as a long workbench, not a short profile page.
- Refresh-driven actions such as cancel / restore / replace teacher / quick schedule / edit student were making users lose context.
- Calendar month switches and "change course" links also reopened the page at the top, which forced rescanning.

## Scope

- Add a small shared client hash helper for the student detail page
- Preserve section hash after these student-detail refresh actions:
  - session cancel / restore / delete
  - replace teacher
  - quick schedule create / reschedule
  - edit student save
- Preserve section hash on these same-page links:
  - calendar month prev / next
  - calendar `Schedule`
  - upcoming-session `Change Course`
- Keep attendance filter apply / clear inside `#attendance`

## Non-Goals

- No changes to student data rules
- No changes to scheduling, cancellation, deduction, or attendance business logic
- No changes to package, billing, or export math

## Risks

- This touches several client components that currently call `router.refresh()`
- Student detail already has multiple section anchors, so the fix must use a consistent hash format
- Same-page links should preserve context without polluting navigation to other pages

## Validation

- `npm run build`
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`
- production read-only QA should confirm:
  - quick-schedule opens back at `#quick-schedule`
  - calendar month switches stay at `#calendar-tools`
  - upcoming-session actions return to `#upcoming-sessions`
  - student edit refresh returns to `#edit-student`

## Release

- Release line: `2026-04-04-r01`
- Status: `LIVE`
