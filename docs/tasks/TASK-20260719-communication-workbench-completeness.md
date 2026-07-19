# TASK-20260719-communication-workbench-completeness

## Context

Academic Operations reported four connected usability failures: reminder copy said only “tomorrow” without an absolute date; the feedback-review editor made a complete teacher submission look truncated and gave no completeness signal; parent reminders, teacher reminders and feedback reviews were mixed in one long queue; and staff-uploaded Ticket screenshots were stored but shown only as raw URLs in Ticket detail.

Read-only production inspection found zero currently open feedback reviews that would be blocked by the stricter completeness rule. One existing staff-assisted parent Ticket contains two stored attachments, so backward-compatible attachment projection and viewing are required.

## Visual and interaction direction

- Visual thesis: a calm, dense Academic Operations workspace with one orange action accent and strong typographic hierarchy.
- Content plan: work queues first, compact task summaries second, detailed review/send/log content only after expansion.
- Interaction thesis: work-queue switching, task disclosure and full-screen authenticated attachment preview provide the main state changes; no decorative motion or dashboard-card mosaic.

## Change

- Format reminder titles and copy with the absolute Singapore business date and weekday while retaining “tomorrow” only as context outside the canonical date.
- Treat the first date-only reminder wording migration as a presentation update when the underlying session lines are unchanged, avoiding false correction tasks for previously sent reminders.
- Render teacher share images with a teacher-specific header and employee-miniapp footer.
- Normalize teacher salutations so names already ending in “老师” never render as “老师老师”.
- Split the miniapp and web communication desks into Feedback Review, Send to Parent, Send to Teacher and Correction queues with per-queue open counts.
- Keep list rows compact and expand only the selected task.
- Project five structured parent-feedback sections plus homework and previous-homework completion into the review workspace, show a 7/7 completeness result, and block publication when a required item is missing.
- Require teachers to explicitly choose whether previous homework was completed instead of treating an untouched switch as “no”.
- Project existing Ticket proof URLs as typed attachment items without changing Ticket storage or historical proof data.
- Add an authenticated staff Ticket-attachment read path that verifies the requested file belongs to the Ticket, logs both uploads and views, downloads images with the staff bearer token, previews images full-screen and opens supported documents.
- Update the stale role-workspace regression expectation to include the existing `CARE` workspace introduced by the Full Care release; no role or permission code changed.

## Non-goals

- No Session time, teacher, student, attendance, package, invoice, receipt, payroll or scheduling-action data changed.
- No automatic WeChat send timing, recipient selection or subscription-message template changed.
- No historical feedback or Ticket records were rewritten or backfilled.
- The public legacy Ticket file route remains available for existing web Ticket pages; the new employee-miniapp viewer uses the authenticated Ticket-scoped route.

## Verification

- Native JavaScript syntax passed for all changed miniapp scripts.
- TypeScript passed with `npx tsc --noEmit`.
- The 41-page miniapp release audit passed with production URL checking, no mock login and no source maps.
- 18 focused communication, Ticket attachment, feedback-quality and operation-log tests passed.
- All 219 repository tests passed after correcting the stale CARE-workspace test expectation.
- The full production build generated all 208 routes/pages.
- WeChat Developer Tools CLI preview passed for AppID `wxe7017f8545e8ad49`; package size is 483,000 bytes (471.7 KB).
- Read-only production compatibility check: 0 incomplete open feedback reviews, 1 Ticket with proof and 2 historical attachment URLs.
- The first guarded production deploy completed at `134d229`; read-only inspection confirmed real `2026年7月20日（周一）` reminders and historical Ticket attachment counts, and exposed one duplicate-honorific edge case that is covered by the follow-up regression test before final release.
- Final guarded deploy, endpoint checks, corrected reminder regeneration and replacement development-version upload remain required.

## Risk

Medium-low. The change touches shared communication projection and feedback publication validation, but does not migrate or rewrite business data. The main residual risk is real-device layout and attachment preview behavior across Emily, Eva and Jasmine’s bound accounts; this requires an experience-version pass after upload.

## Rollback

Rollback to `e76abc1` if the new work queues, completeness checks or attachment viewer regress. Existing Ticket proof text and files remain unchanged and therefore survive rollback.
