# TASK-20260508-teacher-company-name-notice

## Context

Finance asked whether SGT Manage can show teachers a message about the company-name update inside the teacher login area.

## Scope

- Add a teacher-facing notice on the teacher dashboard.
- Add a teacher notices history page.
- Let teachers mark a notice as read.
- Store read tracking in `AppSetting` without adding a migration.
- Keep a default company-name notice in code so the message appears even before an admin notice editor exists.

## Out of Scope

- No payroll calculation changes.
- No expense-claim submission changes.
- No invoice, receipt, or package-balance changes.
- No scheduling, attendance, student, or OpenClaw changes.
- No full admin notice editor yet.

## Verification

- Confirmed no existing `teacher_notices_v1` or `teacher_notice_reads_v1` AppSetting rows would be overwritten.
- `npx tsx --test tests/teacher-notices.test.ts`
- `npm run build`

## Deployment

- Status: ready for deploy.
- Post-deploy: open teacher portal and confirm the company-name notice is visible before being marked read.
