# TASK-20260425 Teacher Feedback Bilingual Prompts

## Goal

Make the teacher after-class feedback template easier for English-first teachers to complete while keeping the parent-facing outcome.

## Problem

The parent-facing feedback structure required five sections, but the editable template showed Chinese section headings first. Many teachers write primarily in English, so they need bilingual section headings and clear English prompts for each section.

## Scope

- Change the feedback template to use bilingual headings:
  - `Lesson focus / 本节课重点`
  - `Current finding / 目前发现`
  - `Class performance / 课堂表现`
  - `Next plan / 下一步计划`
  - `What parents should know / 家长需要知道`
- Add bilingual `Hint / 提示` lines under every section.
- Keep validation compatible with English headings, bilingual headings, and the previous Chinese-only headings.
- Update the teacher SOP text and refresh the feedback-form screenshot.
- Do not change attendance, payroll, feedback forwarding, or database schema.

## Files

- `lib/parent-feedback-format.ts`
- `app/teacher/sessions/[id]/page.tsx`
- `docs/SOP-老师端操作流程图文-20260425.md`
- `docs/assets/teacher-sop-20260425/04-parent-feedback-form.png`
- `docs/tasks/TASK-20260425-teacher-feedback-bilingual-prompts.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- tested empty bilingual template returns all five missing sections
- tested English-filled and Chinese-filled feedback both pass section validation
- verified the real teacher feedback page renders the bilingual template
- refreshed the SOP feedback-form screenshot
- `npm run build`
