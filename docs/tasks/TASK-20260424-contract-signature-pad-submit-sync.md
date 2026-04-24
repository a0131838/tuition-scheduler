# TASK-20260424 Contract Signature Pad Submit Sync

## Summary

Fix the public student-contract sign page so the handwritten signature payload is written into the form synchronously while the parent draws, instead of sometimes lagging behind React state and causing false “please draw the handwritten signature” errors on submit.

## Scope

- update the contract signature pad to write its hidden input value directly during drawing
- keep signature-presence tracking in a synchronous ref so the first stroke is recognized immediately
- keep clear-signature behavior consistent so the hidden payload is removed when the parent resets the pad

## Files

- `app/contract/_components/ContractSignaturePad.tsx`

## Risk

Low. This only changes client-side signature capture timing. It does not change contract wording, signed PDF generation, invoice creation, partner-settlement logic, or package balances.

## Verification

- `npm run build`
- draw a signature and immediately click `Sign contract`; confirm the page no longer returns `Please draw the handwritten signature`
- clear the signature and confirm submit is blocked again until a new handwritten signature is drawn
