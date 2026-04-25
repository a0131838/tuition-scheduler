# TASK-20260425 Parent Facing Teacher Feedback

## Goal

Make teacher after-class feedback read like a parent-facing student progress note instead of a teacher-side lesson log.

## Problem

Recent real feedback records show many submissions describe what the teacher covered, such as worksheets, chapters, grammar drills, or past-paper review. Parents need a clearer result: what learning problem the child worked on, what the teacher found, what changed in class, what will be trained next, and what the family should understand about the child's current stage.

## Scope

- Keep the existing feedback storage fields to avoid a database migration.
- Change the teacher form label and guidance from `Class performance` to a parent-facing feedback structure.
- Require five sections inside the main feedback text:
  - `本节课重点`
  - `目前发现`
  - `课堂表现`
  - `下一步计划`
  - `家长需要知道`
- Generate copied/admin feedback content as `Parent-facing Feedback / 家长视角课后反馈`.
- Keep homework and previous-homework completion as separate existing fields.
- Do not change attendance, payroll eligibility, overdue-feedback queue logic, or forwarding status rules.

## Files

- `lib/parent-feedback-format.ts`
- `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
- `app/teacher/sessions/[id]/page.tsx`
- `app/api/teacher/sessions/[id]/feedback/route.ts`
- `docs/tasks/TASK-20260425-parent-facing-teacher-feedback.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- inspected recent real `SessionFeedback` rows and confirmed the current pattern is often teacher-log style
- added shared client/server section validation
- tested the formatting helper against a complete parent-facing sample and an incomplete sample
- `npm run build`
