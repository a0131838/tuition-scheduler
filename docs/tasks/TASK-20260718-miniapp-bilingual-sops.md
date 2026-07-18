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
