# TASK-20260712 Miniapp Reminder Cron Log Recovery

## Goal

Keep the automatic course-reminder cron runnable after a deployment removes untracked runtime log directories.

## Root Cause

The cron command redirected output into `ops/logs`, but standard deploy cleanup removed that untracked directory. Shell redirection failed before either queue or sender command could start.

## Fix

- Create the runtime log directory at the start of every cron invocation.
- Reinstall the idempotent reminder cron automatically after every successful application deployment.
- Keep the one-entry marker deduplication already used by the setup script.

## Safety

- No reminder was sent during the failed cron window.
- No course, package, attendance, finance, Ticket, or payroll record was changed by the failure.
- The test Session remains available for a repeated automatic-chain verification.

## Verification

- Shell syntax and diff checks passed.
- Production deployed at `b8f2426`; PM2 is online and `/admin/login` returns 200.
- Deployment recreated `ops/logs` and installed exactly one marked cron entry.
- The dedicated test Session was aligned to `2026-07-13 12:10` Asia/Singapore, making its 24-hour reminder due at the next cron boundary.
- Without a manual queue or sender call, the `2026-07-12 12:10` cron scanned 13 sessions and queued exactly 1 notification.
- The sender scanned 1 and sent 1 with zero waiting-consent, retry, failure, or skip results.
- Outbox row `790ed387-6ce3-4083-b507-02957f8f8f56` is `SENT`; `sentAt` is `2026-07-12T04:10:08.137Z`, `error` is null, and the delivered template ID was persisted.
- WeChat accepted the automatic send. Real-phone display confirmation remains a separate user check.
