# TASK-20260816-ticket-cancellation-source-time

## Context

Customer service often receives a cancellation or leave message at or after the lesson start time. The existing guided Web and Staff Mini Program intake mainly offered future lessons, so staff could not reliably link the message to the actual lesson and were forced to put critical facts into free text.

## Change

- Add one source-lesson date selector shared by Web and Staff Mini Program intake.
- Query the selected student's actual sessions from the previous 7 days through the next 90 days.
- Show whether each lesson is upcoming, in progress, ended or already linked to attendance/package handling.
- Add a cancellation-only manual fallback with lesson date, start time, course, optional teacher, leave party, notification date/time and replacement requirement.
- Revalidate the selected session against the student on the server.
- Force manual, in-progress, ended and attendance-linked cancellation requests to `NEED_INFO` with an authoritative review reason.

## Non-goals

- Do not directly cancel or reschedule a lesson during ticket intake.
- Do not change attendance, deduction, package selection, payroll, invoice, receipt or finance behavior.
- Do not weaken the existing formal scheduling executor or its future-session checks.

## Verification

- Focused date-window, source-status, manual-input and Web/Mini Program parity tests.
- TypeScript validation and production build.
- Staff Mini Program release audit and JavaScript syntax check.
- Read-only Playwright verification of student lookup, cancellation selection, manual fallback fields and browser console.

## Risk

Low to medium. The intake surface accepts more historical context, but every non-future or manually matched cancellation is deliberately review-only. Formal scheduling and financial records are outside this change.
