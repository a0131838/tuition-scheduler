# TASK-20260421-package-finance-reconciliation-report

## Why

Finance needs one detailed report covering every package created since SGT Manage went live, and they need to match those packages back to invoices, receipts, and uploaded payment proofs. The existing finance pages can show package balances, invoice progress, or receipt history separately, but they do not yet provide one workbook that joins package master data with billing detail in a way finance can reconcile line by line.

## Scope

- build a finance reconciliation workbook export for all packages since the start of SGT Manage usage
- include four sheets in one `.xlsx` file:
  - package master
  - invoice detail
  - receipt and payment-proof detail
  - exception / mismatch rows
- use the same package amount-basis priority already used elsewhere in the system:
  - purchase ledger amounts first
  - then receipts
  - then package paid amount
- add obvious export links from the finance workbench and student package invoice page
- keep package logic, invoice creation logic, receipt approval logic, and package deduction logic unchanged

## Files

- `lib/package-finance-reconciliation.ts`
- `app/api/exports/package-finance-reconciliation/route.ts`
- `app/admin/finance/workbench/page.tsx`
- `app/admin/finance/student-package-invoices/page.tsx`
- `docs/tasks/TASK-20260421-package-finance-reconciliation-report.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- confirm `/api/exports/package-finance-reconciliation` is included in the compiled route list
- confirm finance pages now expose direct links to download the workbook
- server-side follow-up after deploy:
  - verify the workbook downloads successfully
  - verify the workbook includes non-empty package, invoice, receipt/proof, and exception sheets when production data exists

## Risk

Low. This is a read-only reporting export plus two finance-page links. It does not change package balances, invoice rules, receipt numbering, approval gates, or any scheduling behavior. The main caution is data interpretation, so the workbook explicitly includes amount-basis source and exception rows rather than trying to silently “fix” mismatches.
