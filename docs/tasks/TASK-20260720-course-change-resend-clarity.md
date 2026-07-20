# TASK-20260720-course-change-resend-clarity

## Context

The communication centre previously called every stale, already-sent lesson reminder a generic “更正通知”. The same copy covered cancellation, rescheduling and other changes, so Emily and Eva could not tell what happened or what message to send. A real Steven task demonstrated the problem: the original parent reminder was manually sent, the Session was later safely deleted, and the generated correction did not explicitly say that there was no replacement class.

## Change

- Renamed “更正通知” to “课程变更补发 / Course Change Resend”.
- Kept the safe trigger boundary: an unsent reminder is updated or waived in place; only an already-sent reminder creates a resend task.
- Classified cancellation, time, teacher, location, student and multi-field changes from the previous and current schedule lines.
- Generated precise bilingual WeChat copy with Previous and Current blocks. Cancellation explicitly says that the class is cancelled and no replacement is currently scheduled.
- Projected the original manual-send record and the latest source-Session audit actor/time into the staff communication API without adding a database field or migration.
- Added a clear Previous → Current miniapp card, reason, audit trail and exact next steps. The admin web communication centre receives the same structured comparison and copy.
- Required a WeChat evidence screenshot before a course-change resend can be marked manually sent.
- Updated and re-rendered the Academic Operations, Management and Teacher miniapp SOP set as v1.0.13.

## Safety boundaries

- No Session, Ticket, attendance, package, finance, payroll or parent-permission record is rewritten by the UI change.
- No database migration is introduced; correction context is reconstructed from existing immutable reminder and audit records.
- Completed resend tasks stay completed during later syncs and are not reopened.
- The change does not post directly into WeChat. Staff still choose the original group/person, send, upload evidence and confirm.

## Verification

- 96 backend regression tests passed, including 17 focused communication tests for cancellation wording, single-field change detection and evidence enforcement.
- TypeScript, `git diff --check`, the 43-page miniapp release audit and the full 210-route production build passed.
- Academic Operations (20 pages), Management (18 pages) and Teacher (16 pages) PDFs were re-rendered; key-text extraction and contact-sheet visual inspection passed without blank, clipped or garbled pages.

## Rollout

- Run the guarded release preflight, deploy the exact feature commit, sync communication tasks once, and verify the two real open course-change tasks are rendered with explicit cancellation/no-replacement wording.
- Upload Mini Program development version `1.0.13`, then designate it as the experience version manually in WeChat Public Platform.
- Test Emily and Eva on one existing course-change resend. Do not cancel or create a real Session solely to manufacture a test case.
