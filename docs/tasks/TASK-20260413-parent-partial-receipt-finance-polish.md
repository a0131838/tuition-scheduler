# TASK-20260413-parent-partial-receipt-finance-polish

## Goal

Finish the next finance usability pass for parent partial receipts so finance can follow, create, and export remaining-receipt work more quickly without changing the underlying multi-receipt rules.

## Scope

- Add a dedicated partial-receipt follow-up queue to finance workbench.
- Add an invoice receipt progress CSV export for the currently filtered finance workbench dataset.
- Strengthen receipt create-form safety guidance when the entered amount does not match the invoice's remaining receiptable balance.
- Make next-receipt shortcuts more automatic in package billing by carrying the only unlinked payment proof when that recommendation is unambiguous.

## Guardrails

- Do not change parent receipt numbering rules.
- Do not change amount cap validation.
- Do not change payment-record uniqueness or approval logic.
- Do not change partner billing behavior.
- Do not fabricate proof-amount comparisons because payment proof records currently do not store amount values.

## Verification

- `npm run build`
- finance workbench should show a dedicated partial-receipt queue sorted by due date and remaining amount
- finance workbench should export an invoice receipt progress CSV for the current filtered dataset
- package billing should carry the only unlinked proof into next-receipt shortcuts when there is exactly one
- the receipt create form should show live warnings when amount received is above or below the invoice remaining balance
