# TASK-20260413-parent-next-receipt-shortcuts

## Goal

Make the next parent partial-receipt action obvious in finance tools by exposing the exact next receipt number, such as `RC2` or `RC3`, instead of relying on a generic "next receipt" label.

## Scope

- Update package billing invoice actions so invoices with remaining receiptable balance show `Create RC2` / `Create RC3` style labels and the full next receipt number.
- Update the package workspace inside receipt approvals so the recommended next step also exposes the exact next receipt number.
- Update selected parent receipt details in receipt approvals to show a dedicated next partial-receipt shortcut card that opens the create step with the same invoice only.

## Guardrails

- Do not change parent receipt numbering rules.
- Do not change amount validation or remaining-balance math.
- Do not allow reusing a payment record that is already linked to the currently selected receipt.
- Do not change partner billing behavior.

## Verification

- `npm run build`
- package billing should show explicit `Create RC2` / `Create RC3` action labels for invoices with remaining balance
- receipt-approval package next-step helper should surface the same explicit next receipt label
- selected parent receipt details should show a next partial-receipt shortcut card with remaining balance and next receipt number
