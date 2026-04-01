# TASK-20260401-package-edit-topup-clarity

## Summary
- Make package creation default to `ACTIVE` and reduce editing mistakes by separating package editing from top-up work, with clearer top-up summaries and realistic quick-add presets.

## Scope
- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/_components/PackageEditModal.tsx`
- `app/admin/packages/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- default new package status to `ACTIVE`
- split the package modal into `Edit package / 编辑课包` and `Top-up / 增购`
- add a top-up summary card that shows before/add/after balances
- add quick-add presets for regular packages and New Oriental partner packages

## Validation
- `npm run build`

## Status
- Completed and deployed.
