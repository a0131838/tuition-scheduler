# TASK-20260408-teacher-lead-month-calendar-board

## Goal

Replace the teacher-column lead board with a more intuitive month-calendar view so teacher leads can scan the whole month at a glance and then inspect a selected day below.

## Scope

- keep the same teacher-lead ACL and filters
- switch the primary visual board to a month calendar
- keep a selected-day details section and the detailed table as secondary views

## Non-Goals

- no schedule editing
- no ACL or role changes
- no finance, payroll, or admin access changes
- no alert/report widgets in this pass

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- `https://sgtmanage.com/admin/login` returns `200`

## Files

- `app/teacher/lead/page.tsx`
