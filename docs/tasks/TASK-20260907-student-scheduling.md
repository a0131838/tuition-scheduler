# TASK-20260907-student-scheduling

## Context

Academic operations cancelled a sister's lesson, then could not arrange the brother at the same time until deleting the original lesson. Production investigation found inconsistent checks: availability ignores uncharged EXCUSED attendance, while final quick scheduling rejects the retained Session under the class/start/end unique constraint. The owner requested a single student-directory entry with complete course records and minimal interface expansion.

## Changes

- Reuse existing `/admin/students`. Default to all students, creation-time descending; keep search/source/type filters and add one scheduling filter. Replace duplicate intake tiles with a compact table; intake tools remain available in a collapsed disclosure.
- The table shows recent actual attendance, next lesson and subjects to check. Detail fields remain in the same table's alternate view.
- Follow-up uses active, valid own/shared packages and enrolled subjects. Current-month PAUSED/EXCLUDED items are excluded; one subject having future lessons does not hide another missing subject. No automatic reminders are sent.
- Reuse the existing student detail's course-record section, calendar and schedule PDF. Session-based history includes unmarked sessions and cancellations, supports dates/subject filtering, and paginates 50 rows without a history-age cutoff. Scheduled minutes are not represented as actual attended hours.
- Quick scheduling checks cancellation ownership, including legacy class-owned sessions. Same-student cancelled lessons return an explicit restore action. An uncharged other-student collision uses a separate target-owned one-to-one class to preserve the existing unique constraint and all original references.
- The original cancellation must remain uncharged and future-dated for the transfer control. Staff select a real student from search results and review the existing target scheduling dialog. Source time, teacher and room are revalidated inside the creation transaction; course/subject may be reviewed for the target student.
- Restore uses a serializable transaction, reads fresh attendance, verifies ownership, student/teacher/room/appointment conflicts and availability. It preserves cancellation notes and writes an audit record. Legacy count deductions require review; existing minute refund logic remains inside the transaction.
- Zero-created or partially skipped results stay visible with accurate counts. No false success close. Mobile dialogs resize and scroll locally. The redundant sticky student action panel is static so it cannot interfere with hydration or obscure history filters.
- Existing operations-admin access allows only the academic schedule PDF endpoint in addition to prior routes; finance preview/export routes remain blocked. Observer writes remain blocked.

## Non-goals

- No sidebar/workbench addition, database migration, real student data correction, automatic notifications, package pricing/payroll changes, Mini Program workflow expansion or AI formal execution changes.
- No restoration of Louis/Daisy's 11 September leave records. Production baseline `767dfbe2`; Louis 18 September was already scheduled during investigation.
- This change does not rewrite every alternate scheduling entry. The reported student quick-scheduling path and its restore API are covered.

## Verification

- `npx tsc --noEmit --incremental false` passed.
- `npx tsx --test tests/cancelled-schedule-slot.test.ts tests/quick-schedule-execution.test.ts tests/quick-schedule-messages.test.ts tests/student-schedule-export.test.ts tests/route-guards.test.ts`: 15 passed.
- `scripts/qa/student-scheduling-uat.ts` is hard-guarded to a synthetic local PostgreSQL database at 127.0.0.1:55439/sgt_schedule_test. Real HTTP tests passed: transfer/source retention; wrong transfer shape denied; duplicate rejected; skip reports zero; occupied restoration blocked; own and legacy-owned cancellation requires explicit restore; shared balance unchanged; per-subject follow-up; 55 unmarked historical lessons with pagination; observer read/write isolation; operations read and financial-preview denial; current-month pause suppression.
- Playwright: 1280px desktop and 390px mobile directory/history/dialog inspection; real search/select transfer navigation; mobile body width equals viewport and quick dialog has no horizontal overflow. Local-only test artifacts are under `output/playwright` and are not part of the release commit.
- Final `npm run build` (259 pages) and `git diff --check` passed. Guarded preflight, release and live read-only checks must pass before declaring deployed.

## Operations

1. Open Students, search/select a student to see their course records. Use the same source and scheduling filters to review students without future lessons.
2. For a sister-to-brother transfer: cancel the original lesson without charging, choose Transfer on that cancelled lesson, search/select the brother, review subject/package/time/teacher, then schedule. Do not delete the original lesson to release the slot.
3. For the same student resuming the same cancelled lesson, use Restore. A newly occupied time blocks restoration and requires another scheduling decision.
4. Actual-attendance records require real marking. Unmarked historical lessons remain pending; the system must not fabricate attendance or feedback.

## Risk and Rollback

Medium scheduling risk, covered by serializable writes and fresh resource checks. Shared or ambiguous legacy classes are not silently reassigned. Where a duplicate class/time key must be preserved, an additional internal target-owned class can appear in existing class administration. No new user-facing navigation is introduced.

The follow-up list identifies subjects to review, not proven omissions; old enrolments or missing pause records can require staff judgement. Deleted historical lessons cannot be restored from this view. Existing dependency audit reports three high vulnerabilities; dependency upgrades are outside this scoped release.

Use the standard guarded rollback to the prior production revision if required. Code rollback does not delete valid lessons or audit records created after deployment. Production verification is read-only.
