# TASK 2026-05-13 - Manager Quality Desk

## Context

Jasmine requested two admin-account functions: a Lead Desk that can print the day's schedule for teachers who do not have system access, and a daily manager reflection log to support quality-improvement KPIs and process discipline.

## Scope

- Add a manager-only workspace at `/admin/manager/quality`.
- Add a left-sidebar entry for manager users.
- Show a date-filtered Lead Desk daily schedule grouped by teacher.
- Add print support for the Lead Desk schedule.
- Add a daily workflow checklist for receipts/invoices/claims, teacher feedback quality, mid-term reports, and end-term reports.
- Add free-text reflection fields for operations wins, problems, improvements, and follow-up actions.
- Show read-only quality snapshots from existing approval inbox, feedback, mid-term report, and final report data.

## Out of Scope

- No email reminders.
- No OpenClaw reminders.
- No scheduling, attendance, package balance, payroll, billing, invoice, receipt, or report-assignment workflow changes.
- No new Prisma migration; daily reflections are stored through the existing `AppSetting` JSON pattern.

## Verification

- `npx tsc --noEmit`
- `npm run build`
- Authenticated local HTTP check for `/admin/manager/quality?date=2026-05-13` returned `200`.
- Playwright verified the Jasmine manager sidebar entry and page content.
- Playwright submitted a local reflection log, confirmed the AppSetting write, then the local QA entry and temporary auth session were removed.
