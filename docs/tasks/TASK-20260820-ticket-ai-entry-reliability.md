# TASK-20260820 Ticket AI Entry Reliability

## Problem

The Ticket Center AI preparation action can take several seconds but previously kept the same button label and appearance. Staff could reasonably interpret the accepted submission as a dead click and submit again. The AI OS link itself redirected correctly, but its destination waited on an unnecessarily broad bootstrap.

## Change

- Add a client submit control that immediately displays `AI正在读取，请稍候…`, disables duplicate clicks and restores the existing server-rendered success or failure result after navigation.
- Log only the ticket ID and safe error message when AI preparation fails so operations can diagnose the bridge without exposing ticket content.
- Keep the existing SSO destination, manual workflow and formal confirmation gate unchanged.

## Safety

- No database schema or formal business-data mutation is added.
- AI remains advisory and cannot apply scheduling, attendance, package, payroll or messaging changes through this control.
- Manual processing remains available even when AI is unavailable.

## Verification

- Focused source and plan-normalization tests.
- TypeScript and production build.
- Guarded release and authenticated production browser verification for both controls.
