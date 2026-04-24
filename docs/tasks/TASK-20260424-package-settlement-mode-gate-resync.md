## Task

Make package edits resync invoice-gate status and reason when ops change `settlementMode`, so direct-billing packages no longer keep stale partner-settlement gate copy.

## Why

- Staff can change a student's type and the package settlement mode later.
- Previously the package edit API updated `settlementMode` but left `financeGateStatus` and `financeGateReason` untouched.
- This caused pages to keep showing `Partner settlement package stays outside direct-billing invoice gate.` even after the package was changed back to a direct-billing package.

## Scope

- Recompute package invoice-gate status/reason inside the package edit API.
- Preserve approval-driven statuses when approval records already exist.
- For packages with no approval record, at minimum remove stale partner wording after settlement-mode edits.
- Resync the affected `赵测试` package data after code change verification.

## Key Files

- `app/api/admin/packages/[id]/route.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260424-package-settlement-mode-gate-resync.md`

## Validation

- `npm run build`
- verified `赵测试` package now has:
  - `settlementMode = null`
  - `financeGateStatus = EXEMPT`
  - `financeGateReason = Package is exempt from direct-billing invoice gate.`
