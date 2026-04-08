# TASK-20260408-partner-package-split-batch-entry

## Goal

Let ops record partner package sales as multiple logical purchase batches at create/top-up time so settlement can split them correctly without later production data repair.

## Scope

- package create API supports `purchaseBatches` for HOURS packages
- package top-up API supports `purchaseBatches`
- admin package create form adds a split-batch entry block for 新东方 students
- admin package top-up modal adds the same split-batch entry block

## Non-goals

- no schema changes
- no changes to attendance deduction logic
- no changes to parent billing or student billing
- no changes to offline monthly partner settlement

## Key Files

- `app/api/admin/packages/route.ts`
- `app/api/admin/packages/[id]/top-up/route.ts`
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/_components/PackageEditModal.tsx`
- `app/admin/_components/PurchaseBatchEditor.tsx`
- `lib/package-purchase-batches.ts`

## Notes

- split batches are stored as multiple `PURCHASE` txns with stable ordering
- total paid amount is proportionally allocated across split purchase txns
- UI keeps the feature visible for 新东方 partner students where this settlement need is common
