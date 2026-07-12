# TASK-20260712 Miniapp Feedback Published Notification

## Goal

Notify linked parents when a teacher publishes the first parent-facing after-class feedback for a lesson, using the existing official service-completion template, the established one-time consent ledger, notification outbox, retry sender, and staff consent-attention workflow.

## Template Decision

- The `出国留学（590）` public library has 134 one-time templates but no dedicated after-class feedback template.
- `教育成长规划报告通知` and `专属学习资料推送提醒` are reserved for future report/material features and are not used to mislabel lesson feedback.
- The official `服务完成通知` template is semantically valid for completed feedback delivery and is already in the account for invoice completion. WeChat does not allow the same public template to be added twice.
- Invoice and feedback therefore share the exact official template ID and one-time quota ledger. Consent accepted from either the documents or learning action is pooled by template ID, and every successful invoice or feedback send consumes one shared quota.

## Event Rules

- Queue only when a teacher publishes the first `SessionFeedback` for that teacher and lesson.
- Editing an already published feedback does not create another parent notification.
- Support both the desktop teacher portal and teacher staff-miniapp submission routes.
- Resolve direct-session students, one-to-one students, and class enrollments, then notify only active linked parents with `canViewFeedback`.
- Queue failures are best-effort and never roll back a valid teacher feedback submission.

## Parent And Staff Experience

- Parent home adds one independent `开启课后反馈提醒` action.
- The WeChat card opens the miniapp feedback list and displays service name `课后反馈`, publication time, and a student-specific publication hint.
- Web and permitted staff-mobile attention views include due feedback notifications that have no remaining consent.
- Staff are instructed to ask the parent to open the miniapp and authorize after-class feedback reminders.

## Safety

- No schema migration.
- No feedback content, approval rule, attendance, package, finance, Ticket, Session, payroll, or parent-link rule changes.
- No notification on feedback edits, reducing duplicate parent messages.
- Shared template quota is calculated by exact template ID across both consent groups and all successful sends.

## Verification

- `npx tsc --noEmit`
- `npx tsx --test tests/wechat-miniapp-subscription.test.ts tests/miniapp-feedback-notification.test.ts` (9/9 passed)
- Miniapp JavaScript and deploy shell syntax
- `git diff --check`
- `npm run build` (186 pages)
