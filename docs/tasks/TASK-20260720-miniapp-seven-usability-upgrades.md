# TASK-20260720-miniapp-seven-usability-upgrades

## Context

The employee miniapp already covered the main scheduling, Ticket, communication, teaching and approval workflows, but daily use still required too much searching and offered too little protection against interrupted uploads or incorrect actions. Teachers also needed to attach homework/class materials, and staff needed a direct but auditable way to share reviewed content into WeChat.

## Change

1. Added teacher feedback attachments for images, PDF and Word files, with explicit parent-visible or internal-only visibility, authenticated viewing and audit logs.
2. Added an in-app problem report that captures page, client version, device context and recent sanitized operation summaries, with an optional album screenshot and a real Ticket number.
3. Simplified role homes by keeping daily priorities visible first and placing lower-frequency tools behind an expansion control.
4. Added local drafts for teacher feedback and staff Ticket intake, retained failed uploads for retry, and prevented a Ticket upload retry from creating a duplicate Ticket.
5. Added direct WeChat Mini Program card sharing for published feedback and course reminders. The card opens the exact permitted feedback or schedule destination; copied text and saved images remain fallback channels.
6. Added a manager-only operations health dashboard for overdue/unowned Tickets, feedback delivery, notification failures, approvals, leads and recent attendance/feedback gaps.
7. Hardened privacy and traceability by auditing Student 360, payroll and feedback-attachment reads and displaying a named work-use watermark on Student 360.

The existing manual WeChat workflow remains mandatory: staff choose the recipient/group and tap Send in WeChat, then upload evidence and confirm completion where required. The system does not silently post into a group.

## Safety boundaries

- The attachment migration is additive and does not rewrite Session, Attendance, package, invoice, receipt or payroll data.
- Parent attachment reads require a published feedback, parent visibility and the existing student-feedback permission.
- Teacher reads/writes remain restricted to their own Session feedback; academic/manager access uses the existing coordination capability.
- Direct share paths carry only identifiers and still require server authentication and authorization.
- Existing web pages and business workflows were not redesigned or removed.

## Verification

- 93/93 backend regression tests passed.
- 21/21 focused Mini Program resilience, communication and sharing tests passed.
- Native JavaScript syntax and Mini Program JSON parsing passed.
- The 43-page Mini Program release audit passed with production API, URL checking, no mock login and no source maps.
- Prisma Client generation and the full 210-route production build passed.
- `git diff --check` passed.

## Rollout

- Deploy the additive migration and server endpoints through the guarded production release.
- Upload Mini Program development version `1.0.12`.
- In WeChat Public Platform, manually designate `1.0.12` as the experience version.
- Test one real, controlled flow for Emily, Eva, Jasmine ADMIN and Jasmine TEACHER. Do not fabricate payroll, feedback or family records solely for testing.

