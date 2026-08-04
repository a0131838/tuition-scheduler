# TASK 2026-08-04: Structured teacher preference and controlled parent messages

## Request

Prevent teacher-name entry errors in next-month scheduling and provide approved, versioned parent communication copy for Academic staff.

## Delivered

- Added ID-based teacher preference states: none, current teacher, qualified selected teacher, and manual verification.
- Filtered teacher choices by the item's real course qualification and prioritized the selected teacher during concrete-offer generation.
- Kept shared-package demand separate by student and course.
- Added 18 bilingual parent-message scenarios with required variables, published versions, manager-only version creation/publication, and audit logs.
- Added a Web template center and a Staff Mini Program template generator/copy tool.
- Stored template code, version, rendered variables, and immutable message text on communication tasks.
- Routed next-month initial messages, parent lesson reminders, feedback notices, and parent course-change resends through published templates.

## Safety boundaries

- No formal Session is created or changed by a teacher preference.
- Candidate generation still uses existing qualification, availability, student conflict, and teacher conflict checks.
- No message is sent automatically; clipboard generation and manual-send confirmation remain separate.
- Existing package, balance, attendance, deduction, contract, invoice, receipt, payroll, ticket, and historical lesson records are not rewritten.
- The migration only adds nullable fields, indexes, and one isolated template table.

## Verification

- Prisma format/client generation and TypeScript.
- Focused monthly scheduling, communication center, template rendering, and additive migration tests.
- Mini Program JavaScript syntax checks and release audit.
- Full repository test suite and production build before deployment.
