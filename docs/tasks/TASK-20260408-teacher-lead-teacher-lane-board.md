# TASK-20260408-teacher-lead-teacher-lane-board

## Goal

Make the `Teacher Lead / 老师主管` schedule page feel closer to a real calendar by switching the visual board from "hour buckets with mixed cards" to a "teacher lanes" layout with teachers as columns and hours as rows.

## Scope

- keep the same teacher-lead ACL and filters
- replace the main visual board with a teacher-column day board
- keep the detailed table as a secondary expandable view

## Non-Goals

- no schedule editing
- no ACL or role changes
- no finance, payroll, or admin access changes
- no additional alerts or reporting widgets in this pass

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- `https://sgtmanage.com/admin/login` returns `200`

## Files

- `app/teacher/lead/page.tsx`
