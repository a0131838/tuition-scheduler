# TASK 2026-05-30 - Teacher Notice Shared Docs Attachments

## Context

Finance wants to distribute the updated bilingual tutor payment-details guide through the teacher notice module. The current notice form supports bilingual text and acknowledgement, but it cannot attach the PDF guide directly.

The system already has a Shared Docs upload/download path, so this change reuses that storage instead of adding a second file store inside Teacher Notices.

## Change

- Add an optional `attachmentDocumentId` field to teacher notice records stored in `AppSetting`.
- Let admin/finance users select one active Shared Docs file when creating or editing a Teacher Notice.
- Show the selected attachment on the teacher notice list and dashboard notice card.
- Allow teachers to open or download the specific Shared Docs file only when it is attached to an active published notice.
- Keep the normal Shared Docs library permission unchanged.

## Non-Goals

- No change to payroll, teacher payout amount calculation, payment review, expense claims, attendance, scheduling, packages, contracts, invoices, receipts, or OpenClaw.
- No broad teacher access to the Shared Docs library.
- No new file-storage table for notices.

## Verification

- `npx tsx --test tests/teacher-notices.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`

## Risk

Medium. The file endpoint now has an additional access path for teachers, but only for active Shared Docs attached to active notices. Staff should confirm the attached PDF is the intended teacher-facing version before publishing an important notice.
