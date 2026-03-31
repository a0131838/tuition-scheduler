# TASK-20260331-expense-claim-withdraw

- Date: `2026-03-31`
- Owner: `Codex`
- Status: `Deployed`

## Summary

Add a teacher-facing withdraw action for submitted expense claims so wrong uploads can be pulled back safely before approval.

## Goal

Allow teachers to undo a submitted expense claim without hard-deleting audit history.

## Scope

- `prisma/schema.prisma`
- `prisma/migrations/20260331095000_add_expense_claim_withdrawn_status/migration.sql`
- `lib/expense-claims.ts`
- `app/api/teacher/expense-claims/withdraw/route.ts`
- `app/teacher/expense-claims/page.tsx`
- release documentation only

## Non-Goals

- no hard-delete flow for expense claims
- no approval-rule changes for managers/finance
- no payment or archive flow changes
- no attachment storage-path changes

## Implementation Notes

- New status: `WITHDRAWN`
- Only the submitting teacher can withdraw the claim.
- Only `SUBMITTED` claims can be withdrawn.
- Teachers now see `Withdraw claim / 撤回报销单` in their claim list for submitted items.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify that:

- a teacher can withdraw a submitted claim from `/teacher/expense-claims`
- the withdrawn claim shows `Withdrawn / 已撤回`
- approved, rejected, and paid claims do not show the withdraw button
