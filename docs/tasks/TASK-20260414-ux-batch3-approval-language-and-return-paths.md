# TASK 2026-04-14 UX Batch 3

## Goal

Make approval-driven pages easier to continue from a real workflow by:

- switching approval and queue states to clearer action-first wording
- preserving the source workflow when users jump from Approval Inbox into downstream pages
- adding visible return paths back to Approval Inbox inside those downstream pages

## In Scope

- `app/admin/approvals/page.tsx`
- `lib/approval-inbox.ts`
- `app/admin/receipts-approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- release docs

## Required Outcomes

1. Opening an item from Approval Inbox should append source context so downstream pages know the user came from that workflow.
2. Receipt approvals should show a visible “From Approval Inbox” banner and a direct return link when opened from inbox.
3. Expense claims should show the same kind of source-workflow banner and return link.
4. Approval-related statuses should read as next-step actions, not just passive states.
5. Queue-internal review actions should preserve the source workflow whenever possible.

## Guardrails

- Do not change approval permissions or approval decision rules.
- Do not change receipt math, billing math, or expense claim business logic.
- Keep this batch focused on UX continuity and wording only.

## Verification

- `npm run build`
- open `/admin/approvals`, then jump into a receipt item and confirm the return banner is visible
- open `/admin/approvals`, then jump into an expense claim and confirm the return banner is visible
- confirm statuses read like the next action owner rather than only “pending”
