# TASK-20260401-receipt-approval-package-mode-clarity

## Summary
- Make the receipt-approval page clearer for finance users after they select one package by separating package-workspace mode from the global queue.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- add a dedicated `Package finance workspace / 课包财务工作区` context card once a package is selected
- keep the current package workspace open by default with clearer wording
- add clear back links to the global receipt queue and to the package review step
- downgrade the global receipt queue to a secondary collapsible section while package mode is active

## Validation
- `npm run build`

## Status
- Completed and deployed.
