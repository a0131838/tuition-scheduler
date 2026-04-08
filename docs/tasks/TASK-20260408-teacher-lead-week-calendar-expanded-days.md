# TASK-20260408-teacher-lead-week-calendar-expanded-days

## Goal

Make the teacher-lead schedule board easier to scan by reducing it from a month view to the current week only and showing each day's classes fully expanded instead of folding them behind a "+more" count.

## Scope

- keep the same teacher-lead ACL and filters
- replace the month calendar with a current-week calendar board
- expand every day's visible sessions directly inside the day cell
- keep the selected-day details section and the detailed table below

## Non-Goals

- no schedule editing
- no ACL or role changes
- no finance, payroll, or admin access changes

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- `https://sgtmanage.com/admin/login` returns `200`

## Files

- `app/teacher/lead/page.tsx`
