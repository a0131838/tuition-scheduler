# TASK-20260416-admin-approval-inbox-narrow-width-followup

## Why

Real narrow-window QA after `2026-04-16-r71` found that `Approval Inbox / 审批提醒中心` still horizontally overflowed at a common desktop width with the admin sidebar visible. The top summary cards and approval-row table grid forced the main work area wider than the available content column, so the right side looked cut off and required rescanning.

## Scope

- tighten the approval inbox row/header grid minimum widths so the lane / waiting / risk / amount / action columns still fit within the admin content area on narrower desktop windows
- keep the existing mobile fallback at `max-width: 720px`
- do not change approval filtering, routing, queue logic, or any approval business rules

## Files

- `app/admin/approvals/page.tsx`
- `docs/tasks/TASK-20260416-admin-approval-inbox-narrow-width-followup.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- open `Approval Inbox / 审批提醒中心` at roughly `1024px` viewport width with the admin sidebar visible
- confirm `.app-main` no longer has horizontal overflow on `/admin/approvals?focus=manager`
- confirm `expense-claims`, `receipts-approvals`, `todos`, and `tickets` remain overflow-free at the same width

## Risk

Low. This is a narrow UI-only layout follow-up for the approval inbox table/card composition. It does not change approval counts, queue membership, links, or workflow behavior.
