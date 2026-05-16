# TASK-20260516 Renewal Contract Historical Invoices

## Goal

Allow historical direct-billing students to sign renewal contracts on legacy packages that already have old invoices.

## Problem

The contract signing path treated all package invoices the same. If a legacy package had more than one historical invoice, signing failed before the renewal contract could complete. That was correct for first-purchase contracts, where the system should not guess which existing invoice to link, but it blocked old-student renewal contracts that need their own new invoice.

## Scope

- Keep first-purchase invoice ambiguity protection unchanged.
- Let renewal contracts ignore unrelated historical package invoices.
- Keep renewal idempotency by still reusing an invoice already marked for the same contract.
- Add regression coverage for first-purchase versus renewal invoice handling.

## Non-goals

- No change to receipt math.
- No change to payment proof storage.
- No change to first-purchase parent intake.
- No change to package ledger top-up rules except allowing the existing renewal signing path to continue.

## Files

- `lib/student-contract.ts`
- `tests/student-contract-renewal-invoice.test.ts`

## Risk

Low to medium. This touches the signing path for student contracts, but the change is scoped by contract flow type: first-purchase contracts keep the existing multi-invoice guard, while renewal contracts can proceed on legacy packages with historical invoices.

## Verification

- `npx tsx --test tests/student-contract-renewal-invoice.test.ts`
- `npm run build`
