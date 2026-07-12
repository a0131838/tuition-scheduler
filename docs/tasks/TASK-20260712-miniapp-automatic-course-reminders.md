# TASK-20260712 Miniapp Automatic Course Reminders

## Goal

Automatically send the verified WeChat course template 24 hours before a lesson without duplicate delivery or use beyond a parent's recorded one-time consent quota.

## Scope

- Queue only 24-hour course reminders in the first automatic release.
- Preserve terminal outbox states when the queue job runs repeatedly.
- Map course, subject, teacher, and Singapore lesson time to the four official template keyword IDs.
- Compare accepted subscription audits with already sent messages before delivery.
- Retry transient WeChat/network failures up to three times and expose `PROCESSING` in the admin queue.
- Run queue and sender jobs every five minutes on the production server.

## Safety Boundaries

- Six-hour automatic reminders remain disabled.
- No consent quota means no WeChat API send attempt.
- Reminders more than two hours past their intended window are skipped.
- Course, package, attendance, finance, Ticket, and payroll records are read only.

## Verification

- Unit tests cover official field mapping and accepted-template counting.
- TypeScript, shell syntax, diff, and full Next.js build checks pass.
- Production cron, no-duplicate queue behavior, consent gating, PM2, and HTTP health checks pass.

## Production Result

- Deployed at commit `7aca10c`; PM2 is online and `https://sgtmanage.com/admin/login` returns 200.
- Manual queue execution scanned 11 upcoming sessions and queued 0 because none currently matched a parent-linked reminder target in the window.
- Manual sender execution scanned and sent 0, confirming the previously consumed smoke-test consent was not reused.
- The combined queue/send cron is installed exactly once and runs every five minutes.
