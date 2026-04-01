# TASK-20260401-teacher-portal-first-pass

## Goal

Make the teacher portal feel less cluttered and more like a day-to-day workbench, while also adding an in-portal language switch for `中文 / English / Bilingual`.

## Completed

- Added a teacher-side language update route at `app/api/teacher/language/route.ts`.
- Added `TeacherLanguageSelectorClient` so teachers can switch portal language from the teacher layout directly.
- Reworked `app/teacher/layout.tsx` into grouped navigation buckets:
  - `Today / 今天`
  - `My Work / 我的任务`
  - `Schedule / 课表安排`
  - `Finance / 财务`
- Reworked `app/teacher/page.tsx` into a task-oriented dashboard:
  - welcome hero
  - `Today / 今天`
  - `My Work / 我的任务`
  - `Schedule / 课表安排`
  - `Finance / 财务`
  - risk and confirm sections kept below as focused action panels

## Validation

- `npm run build`

## Notes

- This is the first-round teacher portal cleanup only.
- It intentionally does not change attendance, feedback, availability, payroll, or expense-claim business logic.
- Next passes can continue with:
  - teacher homepage visual polish
  - teacher-side quick task summaries on more pages
  - consistent `中文 / English / Bilingual` phrasing across all teacher high-frequency screens
