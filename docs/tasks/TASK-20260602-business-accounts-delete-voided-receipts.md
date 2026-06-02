# Business Accounts Delete Voided Receipts

Date: 2026-06-02

## Request

Voided Business Accounts receipts should be deletable so the page does not accumulate too many voided rows.

## Scope

- Add a Business Accounts delete action that only works for monthly documents already marked `VOID`.
- Remove the deleted voided document from the Business Accounts store.
- Remove payment proof records linked to that deleted voided document.
- Delete linked Business Account payment proof files from `/uploads/business-payment-proofs/`.
- Add a UI action on `VOID` rows: Delete voided receipt/document.

## Out of Scope

- No change to parent/student receipt deletion.
- No change to New Oriental partner receipt deletion.
- No change to invoice numbering, package balances, attendance, scheduling, payroll, or tutor payments.

## Verification

- `npx tsx --test tests/billing-optimistic-lock.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`
