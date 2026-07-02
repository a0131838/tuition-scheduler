# TASK-20260702 Feedback Desk Overdue Scan Limit

## Context

After restoring 87 accidentally generated manual-forwarded feedback records, the live Teacher Feedback Desk showed only 10 `Missing > 12h` items under `All students`.

Real data review showed:

- 74 of the restored sessions were `EXCUSED`, so the existing page rule correctly hides them because no effective student needs feedback.
- 13 restored sessions had effective students and no final feedback.
- Only 10 of those 13 appeared because the page scanned the latest 600 overdue sessions before applying the missing/proxy logic.
- The remaining 3 valid sessions were older April 2026 rows still inside the 90-day lookback.

## Change

- Replaced the hard-coded overdue scan limit with `FEEDBACK_OVERDUE_SCAN_LIMIT = 2000`.
- Replaced the hard-coded rendered work-item cap with `FEEDBACK_OVERDUE_DISPLAY_LIMIT = 500`.
- Kept the existing `EXCUSED` / no-effective-student exclusion rule unchanged.

## Verification

- Read-only Prisma check with the new 2000 scan limit returned 13 valid missing-feedback sessions under the 90-day lookback.
- `npm run build`

## Risk

- Low. This is a read-side admin workbench change only.
- The page still caps rendered overdue work items at 500 to avoid an oversized UI.
- No feedback writes, attendance, billing, package balance, payroll, scheduling, or OpenClaw behavior changed.
