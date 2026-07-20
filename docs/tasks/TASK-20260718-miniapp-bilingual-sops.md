# TASK-20260718-miniapp-bilingual-sops

## Context

The existing r267 SOP set explains the web workflows. Staff also need equally detailed, role-specific material for the native WeChat mini program so teachers, Emily/Eva and management do not apply desktop instructions to a phone interface.

## Deliverables

- Teacher miniapp SOP: 14 bilingual pages.
- Academic Operations miniapp SOP: 18 bilingual pages.
- Management miniapp SOP: 14 bilingual pages.
- Maintainable A4-landscape HTML sources, real DevTools screenshots, red callouts and validated PDF outputs.

## Capture method

- Used `miniprogram-automator` with WeChat Developer Tools on the iPhone 12/13 (Pro) simulator at 390 × 753.
- Created short-lived CS, ADMIN and TEACHER users plus StaffMiniappSession tokens for role-accurate screenshots.
- Captured real miniapp routes for the workbench, communication center, Ticket intake, scheduling, reminders, tasks, payroll, feedback history, availability and account management.
- Deleted all temporary users, teacher records and sessions after capture.

## Verification

- Teacher PDF: 14 pages; title, `我的待办` and `Jasmine` extraction checks passed.
- Academic Operations PDF: 18 pages; title, `立即录入工单` and `确认已人工发送` checks passed.
- Management PDF: 14 pages; title, `提醒异常` and `Jasmine` checks passed.
- All 46 pages rendered to PNG and passed contact-sheet visual review without blank pages, clipping or overflow.

## Safety

Documentation only. No application source, database schema, business permissions, scheduling, attendance, packages, finance, payroll, notification behavior or production business record was changed.

## 2026-07-19 update (miniapp v1.0.11)

- Academic Operations SOP expanded from 18 to 19 pages. Added Unified Tasks, All Tickets scope/filter reconciliation, Student 360, operation correction, the two-stage feedback workflow, exact numbered WeChat handoff buttons, explicit lesson dates in reminders, and an updated daily checklist.
- Management SOP expanded from 14 to 17 pages. Added Unified Tasks/All Tickets oversight, Management Approval Center, Student 360, new-lead routing, operation correction, and a separate control for feedback publication versus manual WeChat delivery.
- Teacher SOP expanded from 14 to 16 pages. Added Unified Tasks, notices, manager feedback, teaching reports, Student 360 usage, and the current homework limitation: homework is a text field rather than a file-upload action.
- Re-exported all three A4-landscape bilingual PDFs. Verified 52 pages in total, key v1.0.11 text/button labels, image references, and contact-sheet previews; no blank pages, clipping, or garbled Chinese text were found.
- Documentation update only; no miniapp, web application, database, permission, or production data was changed.

## 2026-07-20 update (miniapp v1.0.13)

- Renamed the ambiguous “更正通知” queue to “课程变更补发 / Course Change Resend”.
- Added the real trigger rule: an unsent reminder is updated in place; a resend task is created only when an already-sent reminder later becomes stale.
- Added the Previous → Current comparison, explicit cancellation/no-replacement wording, original sender and lesson-change audit context, and the exact operational sequence.
- Added the management control that a course-change resend cannot be completed without a WeChat evidence screenshot.
- Updated the Academic Operations and Management bilingual SOPs and versioned the three-role miniapp SOP set to v1.0.13.
