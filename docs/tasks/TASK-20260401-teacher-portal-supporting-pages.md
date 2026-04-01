# TASK-20260401-teacher-portal-supporting-pages

## Goal

Extend the refreshed teacher portal visual language to the supporting teacher pages that still felt like older admin screens.

## Completed

- Updated `app/teacher/alerts/page.tsx` to use the teacher workspace hero and a summary-card first screen for pending sessions, teacher not signed, student not signed, and feedback overdue.
- Updated `app/teacher/student-feedbacks/page.tsx` to use the same teacher workspace hero plus summary cards for:
  - students in view
  - feedback entries
  - unread handoffs
  - handoff risks
- Wrapped teacher feedback filters in a clearer filter card so the page no longer drops teachers straight into the long list.
- Updated `app/teacher/tickets/page.tsx` to use the same teacher workspace hero plus summary cards for:
  - open tickets
  - urgent priority
  - missing proof
  - need completion
- Wrapped teacher ticket filters in a clearer filter card before the existing ticket board table.

## Validation

- `npm run build`

## Notes

- This pass is presentation-only.
- It does not change alert sync logic, feedback marking logic, ticket transitions, proof-file access, or completion-note rules.
