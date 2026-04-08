# TASK-20260408-teacher-lead-visual-day-board

## Goal

Make the `Teacher Lead / 老师主管` desk more visual by replacing the plain table-first experience with a calendar-like day board that helps leads scan the whole day at a glance.

## Scope

- keep the same teacher-lead permissions and filters
- add a visual hourly day board as the primary schedule view
- keep the detailed table as a secondary expandable section

## Non-Goals

- no schedule editing
- no permission changes
- no finance, payroll, or admin access changes
- no alert/report widgets in this pass

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- `https://sgtmanage.com/admin/login` returns `200`

## Files

- `app/teacher/lead/page.tsx`
