# TASK-20260718-parent-communication-center

## Context

Parents still rely on WeChat groups even though the system already has parent-miniapp feedback and subscription notifications. Teacher feedback was notifying parents at first submission, while the web “forwarded” flag only recorded a manual step. Emily's CS account also could not use the full web reminder/notification desk. This made “published”, “automatically delivered” and “manually sent to the group” easy to confuse.

## Change

- Add a shared Emily/Eva parent communication and notification center on web and employee miniapp.
- Change new teacher feedback to `PENDING_REVIEW`; preserve the teacher original and allow a separate parent-facing version.
- Publish feedback to parents and queue the automatic learning notification only after Emily/Eva approval.
- Create one family-facing manual WeChat task per student and one consolidated next-day reminder per family/teacher.
- Support task claim/transfer, bilingual copy, PNG share image, album screenshot evidence, manual-send confirmation, automatic retry and waive-with-reason.
- Keep automatic and manual delivery status separate and expose the latest task audit history to Emily/Eva.
- Invalidate stale automatic reminders and create correction tasks when a previously sent next-day schedule changes, cancels or moves out of range.
- Run idempotent communication-task synchronization in the existing five-minute reminder cron.
- Add business audit rows for every communication action and automatic send outcome while retaining the existing generic miniapp mutation log.

## Non-goals

- Do not read WeChat chat history or claim that a copied message was delivered.
- Do not let CS edit notification templates, global reminder timing or protected admin settings.
- Do not change Session scheduling authority, attendance deduction, package balances, billing, payroll or settlement behavior.
- Do not force screenshots for every normal message; screenshots remain available for important or disputed communication.

## Verification

- `npx prisma validate`
- `npx tsc --noEmit`
- `npx tsx --test tests/parent-communication-center.test.ts tests/miniapp-feedback-notification.test.ts`
- native JavaScript/JSON syntax checks
- `bash -n ops/server/scripts/setup_miniapp_course_reminder_cron.sh`
- `npm run test:backend`
- `npm run build`
- production role, migration, cron, HTTP and miniapp upload checks after release

## Risk

Medium. Parent feedback visibility and notification timing are intentionally tightened for new submissions. Historical feedback is explicitly backfilled as published so current parent content remains visible. The new task table and parent-link metadata are additive; nearby finance, attendance, package and payroll data are not modified.

## Completion record

- Released through the standard safe-deploy workflow at runtime commit `474e40c526f4118941553fd844dfe756b8c9e756`.
- Production has 110 applied migrations, PM2 PID `2163400`, HTTP health `200`, and one five-minute reminder cron containing `communications:sync`.
- WeChat development version `1.0.7` uploaded successfully (416.7 KB).
- Detailed bilingual SOPs delivered for Teacher (13 pages), Academic Operations (17 pages), and Management (14 pages), using real Playwright production screenshots, privacy-aware training identities, red callouts, and PDF render/text validation.
