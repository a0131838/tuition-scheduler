# TASK-20260413-parent-partial-receipt-visibility

## Goal

After `r45` enabled multiple parent receipts on one invoice, finance still needed clearer visibility into how much of each invoice had already been receipted and how much remained. This task improves finance-facing visibility only.

## Scope

- show invoice-level receipt progress in `/admin/packages/[id]/billing`
- show linked invoice progress on each parent receipt row in package billing
- add an invoice receipt breakdown section to `/api/exports/parent-statement/[id]`
- include invoice-level receipt progress columns in `/admin/receipts-approvals/history/export`

## Non-Goals

- do not change parent receipt numbering
- do not change parent receipt approval rules
- do not change receipt creation math or over-receipt blocking
- do not change partner billing
- do not change package deduction logic

## Validation

- `npm run build`
- package billing should show receipt count, created amount, approved amount, pending amount, and remaining amount per invoice
- receipt rows in package billing should show the linked invoice's overall progress
- parent statement export should include invoice-level partial-receipt breakdown
- receipt history CSV should include invoice total, receipt count, receipted amount, pending amount, and remaining amount for parent receipts
