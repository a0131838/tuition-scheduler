# TASK-20260817-jessika-communication-reminder-access

## Context

Jessika's existing teacher-linked account has the restricted non-finance `OperationsAdminAcl`. The employee miniapp already allowed that account to open AI communication reminders, but the web page, web API and operations route firewall did not all recognize the same ACL.

## Change

- Allow active operations administrators to open the web AI communication reminder page.
- Allow the same account to read and update audited reminder workflow states through the web API.
- Add the reminder page and API to the operations-admin non-finance route allowlist.
- Add regression coverage for all three permission layers.

## Non-goals

- No finance, package, receipt, payroll, approval or settlement access is granted.
- No reminder recipient, schedule, Ticket, attendance or message-send behavior changes.
- Jessika keeps the same teacher-linked account; no duplicate management account or password is created.

## Verification

- Focused communication-reminder and operations-admin permission tests.
- Complete backend regression suite.
- Next.js production build.
- Guarded deployment preflight and post-deploy health checks.

## Risk

Low. The change only aligns an existing non-finance operations ACL across the web reminder page, API and route firewall. Existing finance denials remain covered by regression tests.
