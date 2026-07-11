# TASK-20260711-miniapp-scheduling-writes

## Context

After the mobile scheduling-coordination loop shipped, Zhao confirmed that Eva and management should also be able to perform real scheduling and rescheduling from the miniapp. Eva's current system role is ADMIN, so the write permission can be defined consistently without granting it to teachers or general CS users.

## Change

- Add an ADMIN-only staff miniapp scheduling-write capability.
- From an existing lesson detail, allow either one additional same-class lesson or a time/duration change to the selected future lesson.
- Preserve the current class, effective teacher, campus, and room for mobile scheduling.
- Require a no-write preview before apply and bind apply to a ten-minute signed preview token, actor, session, action, time, and duration.
- Revalidate all guards inside the write transaction: future time, unmarked attendance, student conflict, teacher availability, teacher lesson/appointment conflict, room requirement/conflict, package eligibility/balance, and duplicate session.
- Audit successful creates and reschedules with actor and before-context identifiers.
- Add a miniapp mode control, date/time/duration fields, conflict preview, and explicit confirmation dialog.

## Non-goals

- No mobile teacher, campus, room, course, enrollment, or class changes.
- No batch/future-series rescheduling.
- No changes to attendance deduction, package ledger mutation, billing, receipts, payroll, or OpenClaw.
- No automatic coordination Ticket closure.

## Verification

- `npx tsc --noEmit`
- Miniapp JavaScript syntax and affected WXML expression checks.
- ADMIN allowed; CS and TEACHER denied by capability checks.
- Signed preview token verification and tamper rejection.
- Read-only preview against a real future production lesson using an authenticated admin staff session.
- Apply request without a valid preview token rejected with `PREVIEW_REQUIRED` and no write.
- `npm run build`

## Risk

High because this introduces production Session writes on mobile. Scope is deliberately limited to a single operation and existing class context, with signed preview, transactional revalidation, role restriction, and audit logging.
