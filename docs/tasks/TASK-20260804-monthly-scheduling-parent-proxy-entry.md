# TASK-20260804 Monthly Scheduling Parent Proxy Entry

## Context

Some parents will not complete the Mini Program flow and instead send their preferred next-month times directly in a WeChat group. Academic staff need to enter that confirmed response without restarting free-form coordination or bypassing the existing scheduling controls.

## Change

- Added a Web proxy-entry form inside the existing monthly scheduling workbench.
- Added a dedicated Staff Mini Program page for the same workflow.
- Staff can record keep, change, pause, or unsure intent; frequency; duration; mode; campus; teacher; weekdays; time ranges; unavailable dates; and parent notes.
- Staff can record up to three ranked concrete options after the family replies.
- Added required communication channel, parent reply date, original message or summary, operator identity, and permanent AuditLog entries.
- Added proxy evidence columns to the monthly scheduling CSV export.
- Added only nullable audit fields and one index to `MonthlySchedulingItem`.

## Non-goals

- Proxy entry does not send a WeChat message automatically.
- It does not create, reschedule, cancel, or replace a formal Session.
- It does not change package balances, attendance, deductions, contracts, invoices, receipts, payroll, tickets, reminders, or historical lessons.
- Finance remains read-only and unrelated roles receive no new permission.
- Matched and scheduled items cannot be overwritten through this flow.

## Verification

- `npx prisma format`: passed.
- `npm run prisma:generate`: passed.
- `npx tsc --noEmit`: passed.
- `npx tsx --test tests/*.test.ts`: 331 passed, 0 failed.
- `npm run miniapp:audit-release`: 57 pages, 0 errors, production API and correct AppID confirmed.
- `npm run build`: 235 pages compiled successfully.
- `git diff --check`: passed.

## Risk

Moderate but isolated. A staff member can transcribe a parent response incorrectly, so the channel, reply date, source summary, operator name, latest-state snapshot, and permanent audit event are mandatory. Existing conflict detection, serializable temporary holds, stale-state guards, permissions, and formal scheduling validation remain in force.
