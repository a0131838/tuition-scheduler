# TASK 2026-07-02 Feedback Desk Disable Bulk Overdue Forward

## Problem

Admin reported that after a teacher feedback item appeared in `Proxy draft pending teacher / 代填草稿待老师补全`, clicking an unclear button caused both `Missing > 12h / 超过12小时未反馈` and proxy-draft queues to become empty.

## Real Data Findings

- On `2026-07-02 11:18` Singapore time, Eva's admin user created/updated 87 overdue feedback records in one batch.
- Those rows were written as `submittedByRole=ADMIN`, `status=LATE`, `isProxyDraft=false`, `forwardedAt=2026-07-02 11:18`, `forwardedBy=Eva`, `forwardChannel=WeChat`, and `forwardNote=Historical overdue feedback marked as sent via WeChat`.
- This matches the old `Batch mark as WeChat forwarded / 批量标记已微信反馈` action.
- Because the queue treats `isProxyDraft=false` as final feedback, those items leave both overdue queues immediately.

## Fix

- Removed the bulk overdue-forward button from Teacher Feedback Desk.
- Disabled the `/api/admin/feedbacks/bulk-forward-overdue` endpoint with HTTP `410`.
- Kept the safer workflow intact:
  - `Missing > 12h`: open the teacher page or create one proxy draft.
  - `Proxy draft pending teacher`: update one proxy draft.
  - `Pending Forward`: mark completed teacher feedback as forwarded.

## Files Changed

- `app/admin/feedbacks/page.tsx`
- `app/api/admin/feedbacks/bulk-forward-overdue/route.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260702-feedback-desk-disable-bulk-overdue-forward.md`

## Verification

- `npm run build`

## Risk

Low to medium. This removes a broad cleanup shortcut and does not modify existing feedback data, teacher feedback submission, attendance, package balances, payroll, billing, scheduling, or OpenClaw.
