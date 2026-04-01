# TASK-20260401-teacher-portal-card-and-midterm

## Goal

Finish the first teacher portal cleanup wave by extending the refreshed teacher-workspace framing to teacher card and midterm-report pages.

## Completed

- Updated `app/teacher/card/page.tsx` to use the shared teacher workspace hero plus summary cards for:
  - subject count
  - intro status
  - teaching language
  - experience
- Updated `app/teacher/midterm-reports/page.tsx` to use the same workspace hero plus summary cards for:
  - pending reports
  - submitted reports
  - total tasks
  - latest assigned date
- Updated `app/teacher/midterm-reports/[id]/page.tsx` to use the same teacher workspace hero plus summary cards for:
  - current status
  - assigned date
  - progress
  - report mode

## Validation

- `npm run build`

## Notes

- This pass is presentation-only.
- It does not change teacher intro save behavior, teacher card PDF export, midterm report save/submit behavior, or report locking rules.
