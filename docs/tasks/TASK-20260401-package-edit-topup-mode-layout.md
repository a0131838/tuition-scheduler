# TASK-20260401-package-edit-topup-mode-layout

## Summary
- Make the package modal switch more clearly between edit and top-up by moving the active form directly under the fixed package context card.

## Scope
- `app/admin/_components/PackageEditModal.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- render only the active mode form instead of keeping both mode layouts stacked in the modal flow
- remove the always-visible divider that made top-up feel visually buried below edit content
- keep delete controls only in edit mode so top-up stays focused on adding balance

## Validation
- `npm run build`

## Status
- Completed and deployed.
