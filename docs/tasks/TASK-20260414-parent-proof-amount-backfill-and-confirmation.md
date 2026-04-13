# TASK-20260414-parent-proof-amount-backfill-and-confirmation

## Why

Finance can now record proof amounts on new parent payment records, but a lot of older proof rows still have no amount. That makes the newer proof-vs-receipt comparison guard much less useful on real historical packages. Finance also still needs one final confirmation guard before creating a receipt whose amount does not match the invoice remaining balance or the selected proof amount.

## Scope

- add an inline finance-only action to backfill or correct `paymentAmount` on existing parent payment-proof rows
- keep the edit lightweight inside the current receipt-approval package workspace instead of adding a new page
- add a submit-time confirm step before creating a parent receipt when `amountReceived` differs from:
  - the invoice remaining balance
  - the selected proof amount, when that proof amount exists
- keep the current live warning copy in the form and add the confirm step as the final guard

## Out of Scope

- partner billing payment proofs
- changing receipt numbering or remaining-balance math
- changing approval decisions or statement math
- requiring every historical proof to have an amount

## Acceptance

- finance can update an existing parent payment proof amount inline from the receipt-approval package workspace
- updated proof amounts appear immediately after refresh in the same table and selection helpers
- creating a receipt with an amount above or below the invoice remaining balance requires an explicit confirmation click
- creating a receipt with an amount different from the selected proof amount requires an explicit confirmation click
- matching amounts should submit without an extra confirm prompt
