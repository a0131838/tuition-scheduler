# TASK-20260402 Repair Loop And Queue Resume

## Goal

Reduce context loss in finance repair work, make the admin students desk reopen the user's last queue on first paint, and lower teacher session-detail scanning cost.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- `app/admin/students/page.tsx`
- `app/admin/students/AdminStudentsClient.tsx`
- `app/teacher/sessions/[id]/page.tsx`
- release documentation updates for the same ship

## Changes

1. Admin receipt approvals
- preserve the selected receipt review context while finance users repair a package workspace
- carry `nextHref` through upload payment proof, delete payment record, and create receipt actions
- keep the package workspace smart-default form aligned with the selected review item
- add an explicit note that repair actions will return to the selected receipt

2. Admin students
- move remembered queue recovery to first paint by reading the preferred queue from a cookie when no explicit `view` or scoped filters are present
- keep writing the preferred queue on the client so repeat visits stay aligned
- add a visible resume banner plus a direct `Switch to today queue` escape hatch

3. Teacher session detail
- add `Attendance status`, `Feedback status`, and `Next action` summary cards above the existing step cards
- add jump links to attendance and feedback sections
- keep the existing `Step 1 / Step 2` guidance in place

## Non-goals

- no route changes
- no DB schema changes
- no approval-order changes
- no receipt creation rule changes
- no student CRUD logic changes
- no attendance save logic changes
- no feedback submission rule changes

## Validation

- `npm run build`
- local logged-in QA for:
  - admin students explicit `view=all`
  - admin students remembered-queue resume without explicit `view`
  - admin receipt approvals package workspace with selected receipt context
  - teacher session detail summary cards and anchor links

## Release notes

- Release ID: `2026-04-02-r06`
- Risk: low
- Rollback: revert this release if finance repair actions stop returning to the intended receipt, if students first paint resumes the wrong queue, or if teacher session summaries obscure existing attendance/feedback entry points
