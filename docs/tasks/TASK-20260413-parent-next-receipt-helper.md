# TASK-20260413-parent-next-receipt-helper

## Goal

After `r45` and `r46`, finance could already create multiple receipts on one parent invoice and see invoice-level progress. This task makes the next receipt flow faster by surfacing a recommended next receipt directly inside the create workspace.

## Scope

- show a recommended next-receipt helper card in the package finance create step
- display invoice no., next receipt no., remaining amount, and suggested proof before submit
- auto-select the most usable unlinked payment proof when possible
- make package next-step CTA jump into a ready-to-create URL with recommended defaults
- show next receipt number inside invoice pickers

## Non-Goals

- do not change receipt numbering rules
- do not change receipt approval rules
- do not change amount validation or over-receipt blocking
- do not change partner billing
- do not change statement math or package deduction logic

## Validation

- `npm run build`
- package create workspace should show a recommended next-receipt helper card
- when only one usable unlinked proof exists, it should auto-select and explain why
- create-step invoice selectors should show next receipt numbers like `-RC`, `-RC2`, `-RC3`
- package next-step shortcut should open the create view with recommended defaults already in place
