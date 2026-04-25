# TASK-20260425 Teacher Feedback Section Inputs

## Goal

Make parent-facing teacher feedback faster to write by replacing the editable template block with separate answer boxes.

## Problem

The bilingual feedback template placed `Hint / 提示` text inside the same textarea where teachers had to write. English-first teachers could understand the prompts, but they still had to delete or overwrite prompt text before submitting, which made the workflow slow and error-prone.

## Scope

- Render five separate parent-facing feedback sections as individual textareas.
- Keep bilingual section headings and prompts outside the editable answer boxes.
- Add expandable examples for each section.
- Show an automatic parent-facing preview assembled from the five answers.
- Submit the assembled feedback into the existing `classPerformance` and `content` fields.
- Keep compatibility with existing formatted feedback and older Chinese-only feedback headings.
- Do not change database schema, attendance, payroll, feedback forwarding, or homework fields.

## Files

- `lib/parent-feedback-format.ts`
- `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
- `app/teacher/sessions/[id]/page.tsx`
- `app/api/teacher/sessions/[id]/feedback/route.ts`
- `docs/SOP-老师端操作流程图文-20260425.md`
- `docs/assets/teacher-sop-20260425/04-parent-feedback-form.png`
- `docs/tasks/TASK-20260425-teacher-feedback-section-inputs.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- tested helper parsing for old Chinese headings, bilingual headings, and unstructured legacy feedback
- tested empty section values return all five missing labels
- verified the real teacher feedback page renders five separate answer boxes and a preview
- refreshed the SOP feedback-form screenshot
- `npm run build`
