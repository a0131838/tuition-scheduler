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

- Shell syntax and diff checks.
- Deploy and verify exactly one cron entry.
- Remove/recreate the log directory path and confirm cron queues and sends the dedicated test Session without a manual sender call.
