# TASK-20260718-miniapp-teacher-daily-workspace

## Context

Teacher testing found three concrete gaps: no mobile payroll acknowledgement, no cross-teacher history for students already taught, and staff Ticket attachments could only be selected from WeChat chats. Management also approved one consolidated teacher todo entry so these actions do not become disconnected menu items.

Read-only production inspection for Jasmine's TEACHER account on 2026-07-18 confirmed that it is linked to a teacher profile, can derive 39 taught students and 1,136 visible historical feedback records, while the July 2026 payroll has not yet been published. The release must therefore show payroll as unavailable and must not generate or publish test payroll data.

## Change

- Add a teacher-only miniapp payroll endpoint and page that reuse the existing published-payroll detail and audited confirmation service.
- Add a teacher-only taught-student feedback endpoint and page, scoped from actual attendance/class teaching relationships and showing parent-facing history from all teachers.
- Add a teacher-only todo endpoint and page covering payroll acknowledgement, attendance/feedback completion, rejected expense follow-up and unread student handover feedback.
- Add the three teacher destinations to the employee home with an action-first priority summary.
- Split Ticket attachment selection into explicit photo-album screenshot and WeChat chat-file actions, with preview, deduplication and removal before submission.

## Non-goals

- Do not change any `app/admin/**` web page or web workflow.
- Do not generate, publish or alter a payroll statement for testing.
- Do not expand a teacher beyond students established by real teaching/attendance relationships.
- Do not change payroll calculations, approval rules, attendance deduction, package balances, scheduling, finance or parent permissions.
- Do not create a production Ticket merely to test the attachment picker.

## Verification

- `npx tsc --noEmit`
- `npx tsx --test tests/miniapp*.test.ts` (`46/46`)
- `npm run test:backend` (`79/79`)
- `npm run build` (`198` pages)
- JavaScript syntax checks for changed native-miniapp files
- `git diff --check`
- Explicit no-`app/admin/**` diff check
- WeChat Developer Tools CLI preview for AppID `wxe7017f8545e8ad49` (`378.9 KB`)
- Read-only production check for Jasmine's TEACHER account: 39 taught students, 1,136 visible historical feedbacks, July payroll not published

## Rollout gate

- Upload development version `1.0.3` and designate it as the experience version.
- Jasmine verifies ADMIN/TEACHER switching, the 39-student boundary, one cross-teacher timeline and the unavailable July payroll state on a physical phone.
- After a real payroll is published through the existing web process, a teacher verifies the amount/session detail and completes one controlled acknowledgement.
- Emily or Eva verifies both album screenshots and WeChat files in a temporary draft, then submits only a genuine Ticket or an explicitly approved test Ticket.

## Risk

Medium. Payroll acknowledgement and feedback-read marking are real writes, but both are restricted to the logged-in teacher and reuse existing audit/read-tracking storage. The broadest read is capped and scoped to students established from real teaching records. There is no migration and no web-page change.
