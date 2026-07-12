# TASK-20260712 Miniapp Reminder Coverage And Attention

## Goal

Finish the operational course-reminder loop after automatic delivery: parents can understand remaining one-time quota and future lesson coverage, while staff can find reminders that reached their send window without consent.

## Parent Experience

- Calculate accepted, consumed, and remaining quota independently across the three official course templates.
- Treat quota as shared by all students linked to the same parent.
- Allocate remaining quota to the family's earliest future lessons for display, avoiding duplicate promises across siblings.
- Show the current student's next three lessons as sent, covered, or needing consent.
- Offer the same three-template authorization action on both the parent home and schedule pages.
- Refresh quota immediately after authorization and state how many new quotas were accepted.

## Staff Experience

- Add `WAITING_CONSENT / 待家长授权` to the web notification queue.
- Add a read-only staff miniapp page listing due 24-hour reminders whose parent has no remaining course quota.
- Show student, parent, phone, lesson time, course, teacher, and the WeChat-group follow-up instruction.
- Add the count and entry to the staff workbench.
- Restrict the mobile list to ADMIN, CS, or active CS-workspace users; teachers do not receive parent contact access.

## Safety

- No schema migration.
- No course, package, attendance, finance, Ticket, or payroll write.
- Existing sender timing, retry, stale-window, deduplication, and cron behavior stay unchanged.
- Coverage is informational; actual send still rechecks unused consent immediately before calling WeChat.

## Verification

- `npx tsc --noEmit`
- `npx tsx --test tests/wechat-miniapp-subscription.test.ts` (4/4 passed)
- Miniapp JavaScript and JSON syntax checks
- `git diff --check`
- `npm run build` (186 pages)
- Read-only real-data check for test parent: accepted 8, consumed 4, available 4, one linked student, test Session `SENT`.
- Read-only attention check: zero current due reminders without consent, confirming no false positive for the test parent.

## External Follow-Up

- Emily does not currently have a matching system User account. Create one with role CS or ADMIN before she needs this staff-mobile list.
- Request-status, unpaid, invoice-issued, and receipt-issued WeChat template IDs and exact keyword fields are still required before those four outbound message types can be completed.
