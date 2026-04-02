# TASK-20260402 Teacher Session Completion Guidance

## Goal

Reduce context loss on the teacher session-detail page by making the attendance-to-feedback flow feel more like a clear completion sequence instead of one long form.

## Scope

- `app/teacher/sessions/[id]/page.tsx`
- `app/teacher/sessions/[id]/TeacherAttendanceClient.tsx`
- `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
- release documentation updates for the same ship

## Changes

1. Session completion state
- add a `Completion state` banner near the top of the session page
- explain whether the session is:
  - still waiting on attendance
  - attendance-complete but feedback-pending
  - fully up to date
- provide a matching direct action:
  - jump to attendance
  - jump to feedback
  - return to my sessions

2. Attendance saved guidance
- upgrade the attendance success message into a stronger completion card
- after saving attendance, guide the teacher directly to the feedback section
- keep the existing attendance save behavior unchanged

3. Feedback saved guidance
- upgrade the feedback success message into a clearer finished-state card
- after saving feedback, explain that the session record is up to date and offer a direct way back to `My Sessions`
- keep the existing feedback form and submit logic unchanged

## Non-goals

- no attendance rule changes
- no feedback validation-rule changes
- no teacher session routing or permission changes
- no new server-side workflow state

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3324` confirmed:
  - `/teacher/sessions/ee0a433a-3b5c-4ab3-94fc-38e0a95faf7a` renders `Completion state`
  - the page still shows `Attendance status`, `Feedback status`, and `Next action`
  - the attendance form now carries `Attendance saved. Move to after-class feedback next.`
  - the feedback form now carries `Feedback saved. This session record is up to date.`

## Release notes

- Release ID: `2026-04-02-r21`
- Risk: low
- Rollback: revert this release if the new guidance cards hide or confuse the existing attendance/feedback forms, if anchor jumps stop pointing to the correct section, or if the finished-state messaging makes teachers think the form is locked when it is still editable
