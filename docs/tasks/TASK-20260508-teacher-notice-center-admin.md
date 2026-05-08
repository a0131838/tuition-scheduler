# TASK-20260508-teacher-notice-center-admin

## Context

After adding the teacher company-name notice, the next improvement was to make this notice area operable without code changes and useful for future finance, schedule, policy, and company updates.

## Scope

- Add `/admin/teacher-notices` for admin/finance users.
- Support notice categories: company, finance, schedule, policy, and general.
- Support bilingual title/body, publish date, optional expiry date, important flag, required acknowledgement, and active/archive status.
- Show read/unread or acknowledged/unacknowledged status by teacher user.
- Let admin reset read records for a notice when renewed acknowledgement is needed.
- Keep teacher dashboard concise by showing only the first two unread notices.
- Keep teacher notice history visible under `/teacher/notices`, including expired or archived published notices.

## Out of Scope

- No database migration.
- No email, WhatsApp, or external push notification.
- No scheduling, attendance, payroll, expense, billing, package, student, or OpenClaw behavior changes.

## Verification

- `npx tsx --test tests/teacher-notices.test.ts`
- `npm run build`

## Deployment

- Status: ready for deploy.
- Post-deploy: open admin notice center and teacher notice history to confirm both render.
