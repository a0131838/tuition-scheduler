# TASK-20260816 Jessika Renewal Reminders

## Request

Jessika must be able to see and work the `Renewal Follow-up / 续费跟进` queue because parent reminders are part of teaching operations. Company finance must remain inaccessible.

## Decision

Treat risk review, parent or New Oriental contact, fixed-message copying, evidence upload, response notes, ownership and next follow-up scheduling as operations. Treat contract creation, billing, payment confirmation and package activation as finance.

## Access Boundary

- Web and Staff Mini Program renewal queues are available to the operations-admin ACL.
- Operations users may update reminder stages through `RENEWAL_CONFIRMED`, plus `NOT_RENEWING` and `PAUSED_SPECIAL` outcomes.
- Existing contract, payment or package-activation stages remain visible for handoff context but cannot be changed by operations users.
- Contract and billing shortcuts are hidden for operations users.
- Server-side status validation rejects attempts to cross into finance stages, even if a request is made outside the UI.
- Web and Staff Mini Program update routes always use the authenticated account as the actor; request data cannot override that identity.

## Non-Goals

- No invoice, receipt, payment, package balance, attendance, payroll or settlement behavior changes.
- No new mini-program page is required; the existing renewal page is enabled by backend capability after deployment.

## Verification

- Focused operations-admin and renewal tests
- TypeScript validation
- Production build
- Guarded GitHub and server release with health verification
