# TASK-20260623 Manager Feedback Link Scroll

## Request

Management clicked `Give feedback / 给反馈` from the Lead Desk table but it looked like nothing happened.

## Root Cause

The link prefilled the feedback form through query parameters, but the form sits above the Lead Desk table. Without an anchor scroll or selected-session confirmation, the page could stay near the table and feel unresponsive.

## Change

- Add an anchor target to the `Manager Feedback to Teacher / 给老师的管理反馈` form.
- Update Lead Desk `Give feedback / 给反馈` links to include the anchor.
- Show a selected-session context panel above the form when the link includes a session.

## Out of Scope

- No database change.
- No feedback storage change.
- No teacher acknowledgement change.
- No scheduling, attendance, package, billing, payroll, or OpenClaw change.

## Verification

- `npm run build`
