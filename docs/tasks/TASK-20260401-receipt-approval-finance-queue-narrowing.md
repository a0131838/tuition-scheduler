# TASK-20260401-receipt-approval-finance-queue-narrowing

## Summary
- Rework the admin receipt-approval finance queue so it fits normal-width screens more comfortably by replacing the wide table layout with a compact card-style worklist.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- replace the unified receipt queue table with compact queue cards
- keep only the most important finance triage details at queue level: receipt number, party, amount, status, and risk
- move invoice, progress, and risk detail into smaller supporting text while leaving full review context in the selected panel
- widen the two-column receipt workspace breakpoint so the queue and detail panel behave better on normal laptop widths

## Validation
- `npm run build`

## Status
- Completed and deployed.
