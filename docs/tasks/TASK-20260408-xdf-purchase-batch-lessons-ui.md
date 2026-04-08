# TASK-20260408-xdf-purchase-batch-lessons-ui

## Goal

Keep 新东方 partner package split-batch entry in lesson terms (`6 / 8 / 10 / 20 / 40 lessons`) instead of exposing raw minute/hour labels in the batch editor.

## Why

- 新东方 students buy lesson bundles, not hour bundles.
- Ops already thinks in `6 / 8 / 10 / 20 / 40 lessons`.
- The previous split-batch editor showed `6h tranche / 30h tranche` and raw minute inputs, which made the newly added batch-entry flow feel inconsistent and easy to misread.

## Scope

- Update the 新东方 batch editor rows to show `Lessons / 课时`.
- Keep internal storage in minutes so FIFO settlement logic stays unchanged.
- Add quick-add lesson chips for standard 新东方 bundle sizes.
- When ops turns on split-batch mode, initialize from the current selected package total instead of a fixed template.

## Files

- `app/admin/_components/PurchaseBatchEditor.tsx`
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/_components/PackageEditModal.tsx`

## Validation

- `npm run build`
- Confirm the split-batch editor now reads in lessons for 新东方 flows while still saving minute totals under the hood.

## Result

Deployed in `2026-04-08-r09`.
