# TASK-20260818 Learning Report Approved Delivery

## Goal

Allow Emily to forward confirmed Midterm and Final Reports from the AI communication queue while preserving an explicit management review gate and writing the real delivery result back to the formal report.

## Root cause

The website showed 黄梓皓's Final Maths Report as SUBMITTED, but the app projected report tasks from generic communication audit state. A prior generic COMPLETED action hid the reminder even though the formal Final Report still had no deliveredAt. The two sources of truth could therefore disagree.

## Implemented workflow

1. Teacher submission remains SUBMITTED; it is not delivery approval.
2. Jessika/admin confirms “可由 Emily 发送” in the Midterm or Final Report centre.
3. The approval actor, time and version are stored in report metadata and audited.
4. Only approved, undelivered reports appear in Emily's web and miniapp learning-report queue.
5. Emily can open the protected PDF and copy the message, but cannot edit or approve the report.
6. “已发送给家长” atomically updates the formal report delivery state and communication audit.
7. Generic completion cannot close a report delivery task; revoke/re-approve creates a new versioned task key.

## Safety boundary

- No schema migration and no bulk backfill.
- Existing submitted reports are not automatically approved.
- No changes to report content, scheduling, attendance, package balances, payroll or finance.
- Web PDF and miniapp PDF use separate authenticated entry points backed by the same renderer.

## Verification

- npm run test:report-delivery
- npm run test:backend
- npx tsc --noEmit
- npm run build
- npm run miniapp:audit-release
- git diff --check

## Production acceptance

- Guarded server deployment completed for feature commit 41b682aa1efd9673dd2a78cc4700cf9d29739b62; local, GitHub and server matched, all 129 migrations were current, PM2 PID 2971673 was online and /admin/login returned HTTP 200.
- The approved-report miniapp PDF endpoint returned HTTP 401 without authentication.
- WeChat development version 1.0.60 uploaded successfully at 796,307 bytes. It was not submitted for review or formally published.
- Jessika confirms 黄梓皓's Final Maths Report; Emily then verifies it appears, opens the PDF, and completes the task only after sending it to the parent.
