# TASK-20260710-miniapp-staff-assisted-parent-request

## Objective

Let staff create parent-request tickets from the native WeChat miniapp on behalf of parents who communicate in WeChat groups, phone calls, offline conversations, teacher handoffs, or internal observations.

## Scope

- Added a staff-authenticated student search endpoint for miniapp request creation.
- Added `POST /api/miniapp/staff/parent-requests` to create existing Ticket-based parent requests.
- Added staff-authenticated attachment upload for parent-request tickets.
- Added native miniapp page `pages/staff-request-new/staff-request-new`.
- Added entry points from staff home and staff request list.
- Extended miniapp upload helper to support staff tokens.

## Business Rules

- The new flow reuses Ticket as the only request/work-order base.
- Created tickets remain in the existing parent-request queue by using the same queue source expected by current staff APIs.
- `createdByName` marks the ticket as staff-assisted.
- The original WeChat/group summary and parent-visible summary are separated in the composed ticket situation text.
- Owner defaults follow existing parent-request rules: complaint and teacher-message requests route to Jasmine, ordinary feedback routes to Eva, and operational categories route to Jasmine unless staff overrides.

## Out Of Scope

- No automatic WeChat group message ingestion.
- No package deduction, scheduling write, finance write, payroll write, or parent binding change.
- No new database migration in this release.

## Verification

- miniapp JS syntax and JSON parse checks passed.
- staff WXML complex-expression scan passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed and included:
  - `/api/miniapp/staff/parent-requests`
  - `/api/miniapp/staff/parent-requests/[id]/attachments`
  - `/api/miniapp/staff/students`
