# TASK-20260517 Renewal Parent Info From Void Contract

## Goal

Let historical direct-billing students create renewal contracts after a first-purchase intake contract was voided, as long as that voided contract already contains complete parent information.

## Problem

Legacy students may need to send parent info first, then void the accidental first-purchase contract and switch to a renewal contract. The renewal entry stayed hidden because reusable parent info ignored `VOID` contracts, even when the voided contract had a valid submitted parent profile.

## Scope

- Include `VOID` student contracts when looking for reusable parent information.
- Keep the existing parent-info shape validation, so empty or incomplete void contracts are still ignored.
- Keep first-purchase and renewal signing behavior unchanged.
- Add regression coverage that reusable parent-info status candidates include `VOID`.

## Non-goals

- No automatic conversion from first-purchase to renewal.
- No change to invoice creation.
- No change to receipt, payment proof, package balance, attendance, or scheduling logic.

## Files

- `lib/student-contract.ts`
- `tests/student-contract-renewal-invoice.test.ts`

## Risk

Low. This changes only the candidate statuses used to find a reusable parent profile. The existing parent-info parser still rejects incomplete data.

## Verification

- `npx tsx --test tests/student-contract-renewal-invoice.test.ts`
- `npm run build`
