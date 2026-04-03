# TASK-20260403-student-package-month-end-balance-ledger-basis

## 1) Request

- Request ID: `2026-04-03-student-billing-month-end-balance-ledger-basis`
- Requested by: user approval for phase 2 after finance month-end balance report release
- Date: `2026-04-03`
- Original requirement: upgrade the month-end balance report so amount history can follow package purchase/top-up ledger more strictly instead of relying only on receipts or current package paid amount.

## 2) Scope Control

- In scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403173000_add_package_txn_delta_amount/migration.sql`
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/packages/[id]/route.ts`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `app/admin/packages/[id]/ledger/PackageLedgerEditTxnClient.tsx`
  - `lib/student-package-month-end-balance.ts`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - release docs for this ship
- Out of scope:
  - attendance deduction logic
  - receipt approval / invoice approval logic
  - partner settlement calculation logic
  - retroactive perfect reconstruction for all historical packages
  - `MONTHLY` and `GROUP_COUNT` package amount reporting
- Must keep unchanged:
  - package minute deduction / rollback behavior
  - student billing issue flow
  - receipt / approval business rules
  - current package remaining balance logic

## 3) Findings (Read-only Phase)

- Root cause: phase 1 report could reconstruct historical remaining hours from `PackageTxn`, but amount was still a management estimate because purchase/top-up ledger records did not store amount deltas.
- Affected modules:
  - `PackageTxn` schema
  - package create / top-up write paths
  - package ledger maintenance route
  - month-end balance helper and export
- Impact level: Medium. This adds a schema migration and changes future `PURCHASE` ledger writes, but still does not change deduction logic or approval flows.

## 4) Plan (Before Edit)

1. Add an optional amount field on `PackageTxn` so purchase/top-up ledger rows can carry amount history.
2. Write that amount on new package creation and top-up purchase rows; also allow a single-purchase package edit to align the original purchase row with edited paid amount.
3. Update the month-end balance report to prefer purchase-ledger amount basis only when the package already has complete purchase-amount history; otherwise keep the existing safe fallback to receipts or package paid amount.

## 5) Changes Made

- Files changed:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403173000_add_package_txn_delta_amount/migration.sql`
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/packages/[id]/route.ts`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `app/admin/packages/[id]/ledger/PackageLedgerEditTxnClient.tsx`
  - `lib/student-package-month-end-balance.ts`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-ledger-basis.md`
- Logic changed:
  - `PackageTxn` now supports optional `deltaAmount`
  - new `PURCHASE` rows created by package creation and top-up now record amount basis when available
  - single-purchase `HOURS` packages can align that purchase row amount when package paid amount is edited later
  - package ledger edit/delete/restore flow now carries purchase amount history too
  - month-end balance report now prefers purchase-ledger amount basis when purchase amount history is complete
- Logic explicitly not changed:
  - no attendance deduction writes
  - no package remaining-minute math changes
  - no receipt / invoice / approval behavior changes
  - no partner settlement behavior changes

## 6) Verification

- Build:
  - `npm run prisma:generate`
  - `npm run build`
- Runtime:
  - deploy-time Prisma migration through the existing server deploy flow
  - post-deploy startup check
- Key manual checks:
  - student billing month-end report still renders and now explains the stronger purchase-ledger basis
  - package ledger shows purchase amount column and allows purchase amount maintenance for privileged ledger edits
  - old packages without purchase amount history still fall back safely instead of breaking the report

## 7) Risks / Follow-up

- Known risks:
  - this improves future / maintained purchase history, but cannot perfectly reconstruct every old package that never stored purchase amount deltas
  - purchase amount basis is still blended across purchase rows; it does not introduce per-session layer depletion
  - this ship includes a schema migration and package write-path changes, so deploy risk is higher than the previous read-only reporting ships
- Follow-up tasks:
  - if finance later needs full audit-grade historical valuation by layer, add explicit amount allocation rules for multi-purchase package consumption
  - consider backfill tooling for historical single-purchase packages if finance wants broader historical coverage

## 8) Release Record

- Release ID: `2026-04-03-r15`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r15`
