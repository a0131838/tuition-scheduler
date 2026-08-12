# TASK-20260812-ticket-source-integrity-r359

## Context

Ticket `20260812-002` for Andrew was created through staff-assisted parent intake and recorded WeChat as the communication channel. Andrew's student profile has no source channel. The advanced edit form offered only business-source options, so the browser displayed its first option, New Oriental, even though that value was not the ticket's recorded entry source. Saving unrelated fields could then persist the incorrect option.

## Decision

Treat the three concepts as separate facts:

- Request entry: where the request entered the system, including parent Mini Program, staff-assisted parent request, or Admin/dedicated intake link.
- Communication channel: where the parent conversation happened, such as a WeChat group.
- Student source: the source channel stored on the linked student profile.

The ticket page displays all three independently. Request entry and student source are read-only from the ticket editing workflow. Linked-student intake derives the operational ticket source from the student profile and refuses to guess when the profile source is missing.

## Changes

- Add a shared nullable student-source mapper.
- Return profile source facts from ticket student lookup.
- Enforce profile source in linked-student ticket creation at the API boundary.
- Remove source writes from advanced ticket editing.
- Display request entry, communication channel and student source separately.
- Add a missing-source queue and direct profile correction links.
- Block student-page scheduling-ticket creation until the source is set.
- Add focused regression coverage for source integrity.

## Non-goals

- No historical ticket or student source backfill.
- No automatic classification of blank sources.
- No changes to formal lesson scheduling, attendance, package deductions, reminders, payroll or finance.
- No change to Mini Program request submission behavior.

## Verification

- `npx tsx --test tests/ticket-source-integrity.test.ts tests/ticket-scheduling-actions.test.ts tests/miniapp-emily-request-intake.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- Read-only production data confirmation for ticket `20260812-002` and the missing-source count.
- Standard release preflight and post-deploy server/GitHub/local alignment checks.

## Risk And Rollback

Risk is narrow and intentional: staff must set a missing student source before creating a new linked-student ticket. This prevents incorrect partner classification. Roll back to `97aa21e0` if intake is unexpectedly blocked for a correctly configured student.
