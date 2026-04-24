# TASK-20260424-direct-billing-renewal-auto-topup

## Goal

Close the direct-billing renewal loop so normal renewals no longer depend on the old manual package top-up path.

## Scope

- When a direct-billing renewal contract is signed:
  - auto-create or link the parent invoice draft as before
  - auto-add the renewal lesson minutes back onto the package
  - write a package transaction marker so the renewal top-up is auditable and idempotent
- Downgrade the old package `top up` UI for direct-billing packages into a clearly marked special/manual path.
- Update package billing copy so ops understands that renewal signing now adds hours and creates the invoice draft.

## Files

- `lib/student-contract.ts`
- `app/admin/_components/PackageEditModal.tsx`
- `app/admin/packages/[id]/billing/page.tsx`

## Risk

Medium.

This touches the contract signing path for direct-billing renewals. The main risk is duplicate package balance increases if the signing flow retries. The implementation therefore marks renewal-created package purchase transactions with a contract-specific marker and skips re-applying the top-up if that marker already exists.

## Verification

- `npm run build`
- Real DB QA with temporary direct-billing student/package:
  - create ready-to-sign renewal contract
  - sign contract
  - verify package `totalMinutes` and `remainingMinutes` increase by the renewal contract minutes
  - verify invoice draft is created
  - verify renewal package transaction note contains `student-contract-renewal-topup:<contractId>`
  - cleanup temporary student, package, contract, txn, and invoice data afterwards
