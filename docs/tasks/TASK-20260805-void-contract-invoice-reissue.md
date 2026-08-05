# TASK-20260805-void-contract-invoice-reissue

## Context

The corrected Full Care rollout requires voiding the immutable signed test contract and deleting its unreceipted invoice draft before reissue. The invoice UI treated a VOID contract link as active, leaving no safe correction path.

## Change

- Treat only non-VOID agreement links as invoice-deletion blockers.
- Show invoices linked solely to VOID contracts as archived links.
- Continue using the existing receipt guard and audited invoice deletion workflow.
- Preserve the signed PDF and VOID contract event history while detaching the deleted invoice reference.

## Non-goals

- No invoice deletion when any linked agreement is active.
- No invoice deletion when a receipt exists.
- No payment, receipt, package-balance, attendance, payroll, scheduling or lesson-deduction changes.

## Verification

- Focused tests prove SIGNED and INVOICE_CREATED links block deletion, while VOID-only links do not.
- The complete 240-page production build passes.

## Risk

Low to moderate. The path is limited to explicit VOID agreement history and remains protected by the existing no-receipt requirement.
