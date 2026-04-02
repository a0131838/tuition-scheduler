# TASK-20260402 Storage Helper And UX Follow-ups

## Goal

Ship a low-risk follow-up release that improves attachment triage and page guidance while preparing the codebase for future storage-driver migration without changing current business logic.

## Scope

- `lib/business-file-storage.ts`
- `lib/expense-claim-files.ts`
- `lib/shared-doc-files.ts`
- `app/admin/expense-claims/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `app/admin/reports/partner-settlement/billing/page.tsx`
- `app/admin/students/page.tsx`
- `app/admin/students/AdminStudentsClient.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/tickets/archived/page.tsx`
- `app/api/admin/expense-claims/route.ts`
- `app/api/admin/parent-payment-records/[id]/file/route.ts`
- `app/api/expense-claims/[id]/receipt/route.ts`
- `app/api/shared-docs/[id]/file/route.ts`
- `app/api/teacher/expense-claims/route.ts`
- `app/api/teacher/expense-claims/resubmit/route.ts`
- `app/api/tickets/upload/[token]/route.ts`
- `app/api/tickets/files/[filename]/route.ts`
- `app/teacher/expense-claims/page.tsx`
- `app/teacher/sessions/[id]/page.tsx`
- `app/teacher/tickets/page.tsx`
- release documentation updates for the same ship

## Changes

1. Finance/admin attachment triage
- add clearer attachment-issue queueing and counts in admin receipt approvals
- add attachment-issue filters, counters, and warning cards in admin expense claims
- keep existing approval order, payment transitions, and queue sources unchanged

2. Admin/teacher UX follow-ups
- let admin students remember the last queue when no explicit `view` is passed
- add a direct “open all students” recovery CTA when today queues are empty
- add teacher session-detail step guidance so teachers see `attendance first` and `feedback second` more clearly

3. Shared local business-file storage layer
- add one helper for local business uploads and file access:
  - store upload
  - resolve disk path
  - file exists
  - delete stored file
  - build download response
- move these local-storage paths onto that helper:
  - expense-claim receipts
  - parent payment proofs
  - partner payment proofs
  - shared-doc local fallback
  - ticket attachments
- keep the same route URLs, same database fields, and same local `public/uploads/*` runtime storage

## Non-goals

- no route changes
- no DB schema changes
- no object-storage migration
- no upload destination change
- no approval-order or payment-rule changes
- no ticket workflow changes
- no expense-claim workflow changes
- no teacher feedback submission-rule changes

## Validation

- `npm run build`
- `npm run audit:upload-integrity`
- local helper smoke check for store/read/delete across:
  - expense claims
  - parent payment proofs
  - partner payment proofs
  - shared docs local
  - tickets
- logged-in live QA for:
  - `/admin/expense-claims`
  - `/admin/receipts-approvals`
  - `/admin/reports/partner-settlement/billing`
  - `/admin/shared-docs`
  - `/admin/tickets`
- live attachment probes confirmed expected success for:
  - `/api/expense-claims/[id]/receipt`
  - `/api/admin/parent-payment-records/[id]/file`
  - `/uploads/partner-payment-proofs/*`
  - `/api/shared-docs/[id]/file`
  - `/api/tickets/files/[filename]`

## Release notes

- Release ID: `2026-04-02-r04`
- Risk: medium-low
- Rollback: revert this release if any uploaded attachment type stops opening, downloading, or being detected correctly
- Post-deploy closeout: `quick_deploy.sh` finished successfully, `new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `feat/strict-superadmin-availability-bypass`, and `https://sgtmanage.com/admin/login` returned `200`
