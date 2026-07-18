# TASK-20260718 Guided Web Intake And Miniapp Operation Audit

Release candidate: `2026-07-18-r266`

## Context

The scheduling work-order backend, web execution queue and native miniapp intake were live, but the existing public intake URL still rendered the old dense form and did not create TicketSchedulingAction rows. Miniapp business services had many domain-specific audits, but there was no single fallback trail covering every authenticated mutation, failed mutation and upload.

## Change

- Make the existing token URL default to a four-step guided scheduling flow: select student, add one or more actions, record the parent message, and upload evidence.
- Load up to 30 future Sessions for the confirmed student and require an exact source lesson for reschedule, cancellation and teacher replacement.
- Preserve the legacy complete form behind a secondary entry for non-scheduling tickets.
- Write structured actions in the same transaction as the web-created Ticket; cancellation-plus-replacement creates a second create-session action.
- Show resolved/total action counts on the intake agent's existing ticket board.
- Derive ticket source from the student's source channel and reject any source Session outside that student.
- Keep incomplete reschedule/replacement actions out of the ready lane until the requested time/target teacher is known.
- Add a generic authenticated miniapp operation endpoint and make the shared request/upload helper emit redacted success/failure audit context for every mutation and upload.
- Add `MINIAPP` and `TICKETS` to the existing audit-report module filter.

## Non-goals

- No automatic change to any Session, Attendance, package balance, invoice, payroll or settlement.
- No historical Ticket backfill.
- No logging of GET reads or unauthenticated login attempts before a miniapp session exists.
- No formal WeChat submission or experience-version designation.

## Verification

- [x] Focused scheduling and operation-audit tests: `8/8`.
- [x] Miniapp/WeChat/scheduling regression tests: `64/64`.
- [x] Backend regression tests: `79/79`.
- [x] All native-miniapp JavaScript syntax checks.
- [x] Miniapp release audit: 34 pages, zero errors.
- [x] TypeScript.
- [x] Full production build: 200 pages.
- [x] `git diff --check`.

## Release Gate

- [ ] Guarded release preflight and server deployment.
- [ ] Verify production commit alignment, PM2 and HTTP 200.
- [ ] Verify an existing active token renders the guided intake without creating business data.
- [ ] Verify unauthenticated operation logging returns 401.
- [ ] Upload WeChat development version `1.0.6` and designate it manually only after review.

## Risk

Medium-low. The highest-risk write remains the existing scheduling execution path and is unchanged. Guided intake only creates Ticket/action records after exact student/session validation. Generic miniapp logging adds AuditLog volume but is limited to mutations/uploads, redacts credentials and signatures, and is deliberately non-blocking.
