# TASK-20260330-expense-submit-route-stability

- Date: `2026-03-30`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Move expense-claim submit and resubmit flows away from deployment-sensitive Next Server Actions and onto stable POST routes.

## Goal

Make teacher/admin expense submissions resilient when a user keeps an older tab open across multiple deploys.

## Scope

- `app/api/teacher/expense-claims/route.ts`
- `app/api/teacher/expense-claims/resubmit/route.ts`
- `app/api/admin/expense-claims/route.ts`
- `app/teacher/expense-claims/page.tsx`
- `app/admin/expense-claims/page.tsx`
- `app/_components/ExpenseClaimForm.tsx`
- release documentation only

## Non-Goals

- no expense validation-rule changes
- no duplicate-submit rule changes
- no approval, payment, or archive rule changes
- no receipt storage-path changes

## Implementation Notes

- Teacher new submit now uses `/api/teacher/expense-claims`.
- Teacher rejected-claim resubmit now uses `/api/teacher/expense-claims/resubmit`.
- Admin self-submit now uses `/api/admin/expense-claims`.
- The route handlers preserve the existing validation, duplicate cleanup, redirect messages, and file-write behavior.
- `ExpenseClaimForm` now uses standard multipart POST submission for these flows.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify that:

- an older teacher expense page refreshed after deploy can submit normally
- teacher resubmit still works for rejected claims
- admin self-submit still works from `/admin/expense-claims`
