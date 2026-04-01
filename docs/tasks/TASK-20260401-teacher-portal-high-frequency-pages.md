# TASK-20260401-teacher-portal-high-frequency-pages

## Goal

Make the main teacher work pages feel like one coherent teacher portal instead of separate admin-style screens.

## Completed

- Added a shared teacher page hero component at `app/teacher/_components/TeacherWorkspaceHero.tsx`.
- Updated `app/teacher/sessions/page.tsx` to use the new hero plus summary cards for:
  - today
  - next 30 days
  - feedback pending
  - feedback overdue
- Updated `app/teacher/availability/page.tsx` to use the same first-screen framing plus summary cards for:
  - covered days
  - total ranges
  - next 7 days
  - undo status
- Updated `app/teacher/expense-claims/page.tsx` to use the same framing plus summary cards for:
  - active claims
  - needs fix
  - approved unpaid
  - paid
- Updated `app/teacher/payroll/page.tsx` to use the same framing plus summary cards for:
  - current stage
  - total salary
  - sessions in cycle
  - cycle window

## Validation

- `npm run build`

## Notes

- This pass is presentation-only.
- It does not change attendance submission logic, availability APIs, expense-claim rules, or payroll workflow rules.
- A later pass can continue by applying the same visual language to:
  - `app/teacher/alerts/page.tsx`
  - `app/teacher/student-feedbacks/page.tsx`
  - `app/teacher/tickets/page.tsx`
