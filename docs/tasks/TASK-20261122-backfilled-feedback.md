# Backfilled lesson feedback and completion clarity

## Context and scope

User authorised a targeted fix on 2026-11-22 after a historical lesson showed feedback overdue despite its verified 90-minute deduction. Investigation established that the session was created five days after its lesson date, but feedback timing was still based solely on the historical end time. The session had no linked feedback. This release must not create teaching content, mark feedback completed, duplicate lessons, or debit package balances.

## Implementation

- Add nullable `Session.feedbackAvailableAt`. The migration adds the column without a default for old rows, then sets a creation-time default for new rows. Only a matching immutable SCHEDULING Session creation audit can restore an old historical backfill's actual availability. The earliest creation audit is used. Unknown history stays null; migration time is never substituted.
- Shared deadline is `max(lesson end, evidenced record creation) + 12h`. Ordinary lessons remain unchanged. Resaving attendance or feedback never resets this clock. Session dates and historical feedback content/status remain intact.
- Web lesson timeline/detail, staff mini schedule/calendar/detail/todos, feedback submission on both clients, missing-feedback desk, sign-in alerts and teacher feedback reminders use this timing. Both clients retain 90 days of teacher feedback recovery; mini attendance retains its existing 30-day window.
- Read-only `lessonWorkStatus` separates attendance, recorded deduction and feedback. It shows 90 minutes as minutes, group counts as counts and monthly/waived lessons as no deduction required. Teaching feedback is still required for free teaching. Backfill time/deadline and no-repeat-deduction guidance appear beside the task.
- Formal feedback is complete regardless of publication review; drafts and other teachers' feedback do not satisfy the assigned teacher's task. Proxy draft uses the same deadline, locks the session, and refuses to overwrite a formal submission.
- Historical scheduling entry points advise staff to find/open an existing lesson rather than recreate it for missing feedback. Existing scheduling overlap/duplicate checks and all financial write paths remain unchanged.

## Verification

- 185 existing backend tests and 27 focused timing, state, policy, cancellation and ledger-evidence tests pass.
- `npm run build` passes.
- `scripts/qa/backfilled-feedback-uat.ts` is guarded to the local isolated database. Actual web and mini feedback endpoints both submit a five-day-old backfill ON_TIME; read surfaces agree on its deadline; submitted lessons leave the teacher todo; Finance submission is rejected. Reminders and alerts distinguish genuine legacy overdue lessons from fresh backfills. An audit-only metadata restoration preserves unknown legacy rows.
- Repeated teacher attendance saves on both clients preserve package balances and transaction identities/amounts. Teacher feedback writes also preserve a full snapshot of packages, attendances and transactions.
- Actual mobile browser shows the three statuses and opens the exact lesson. Native WeChat simulator loads the isolated API and displays the three statuses, creation time/deadline and no-repeat warning; teacher todos exclude already-submitted lessons.
- Production verification must compare the investigated lesson's before/after financial hashes, check the restored creation timestamp and deadline, and confirm exact commit equality/HTTP health after guarded deployment.

## Release and rollback

Previous production commit: `9887f93890a0340126982ea629cdb2fc81219e5b`. Use the standard guarded release to production; additive metadata is safe to leave if reverting application code. Do not remove financial records as part of rollback. Mini program is based on the current canonical release branch, uses a higher version and preserves previous file paths; development upload is not proof of experience/formal publication. Keep actual channel state in the canonical ledger.

## Staff operation

1. Find the existing student lesson by actual date and time; open it.
2. Read attendance, recorded deduction and feedback separately. If deduction is already recorded, do not repeat it or delete/recreate the lesson to clear a task.
3. If feedback is missing, the assigned teacher opens this same lesson, checks the student/date and submits the real lesson feedback. If staff say it was already written elsewhere, locate that original record before any association correction; never copy another lesson's comments.
4. Historical backfills show actual creation and a twelve-hour supplement deadline. Normal classes retain the end-plus-twelve-hour rule. A pending publication review does not send the lesson back to the teacher's missing-feedback queue.
5. Refresh the task list. If a verified submission still appears missing, report the exact lesson link/date/student; no financial workaround is required.

## Remaining operational boundary

The current lesson genuinely lacks feedback. This fix cannot certify that teaching content was written elsewhere. The assigned teacher must confirm and submit it. Existing mini program installations receive server timing fixes immediately; new status presentation needs the verified client version. Experience/formal channel confirmation is separate from development upload.
