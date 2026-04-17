# TASK-20260417-student-calendar-month-pager-hard-refresh

## Why

Ops reported that the student detail schedule calendar would not visibly change month when clicking `Prev Month / 上月` or `Next Month / 下月`. Investigation showed the server already rendered the requested month correctly, but the same-page navigation path was updating the URL without reliably refreshing the calendar block. This made the student scheduling calendar feel broken even though the underlying month calculation was correct.

## Scope

- fix student-detail calendar month switching so prev/next month always reloads the correct calendar content
- keep the existing month math, routes, anchors, and calendar query parameters unchanged
- preserve the student-detail calendar section and jump target behavior
- keep the fix narrow to the student-detail month pager only

## Files

- `app/admin/students/[id]/page.tsx`
- `app/admin/students/[id]/_components/StudentCalendarMonthPagerClient.tsx`
- `docs/tasks/TASK-20260417-student-calendar-month-pager-hard-refresh.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- browser check:
  - open student detail at the calendar tools section
  - click `Next Month / 下月` and confirm the visible month label changes
  - click `Prev Month / 上月` and confirm the visible month label changes back
  - confirm the page still lands on `#calendar-tools`

## Risk

Low. This is a narrow student-detail UI navigation fix. It does not change calendar month calculations, scheduling data, package logic, or any appointment creation rules; it only makes the existing month pager perform a full navigation so the rendered content stays in sync with the URL.
