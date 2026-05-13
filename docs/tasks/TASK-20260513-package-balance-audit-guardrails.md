# TASK-20260513 Package Balance Audit Guardrails

## Context

Academic package balances have had several historical cases where `CoursePackage.remainingMinutes` and the package transaction ledger total drifted apart. Operators then saw a PDF ledger or transaction list that did not match the balance used by attendance deduction, causing confusion such as "there is balance but it cannot deduct" or "the export and system disagree."

## Scope

- Add an admin/finance-visible package balance audit page.
- Show packages where current remaining balance does not equal the ledger sum.
- Show recent high/medium-risk rollback and adjustment rows for academic review.
- Warn directly on a package ledger page when the package current balance and ledger closing balance disagree.
- Make manual package transaction edit/delete/restore/create endpoints re-sync the package remaining balance from the ledger total after the ledger change.
- Keep OpenClaw, attendance rules, scheduling, invoices, receipts, payroll, and partner settlement logic unchanged.

## Files

- `lib/package-balance-audit.ts`
- `app/admin/reports/package-balance-audit/page.tsx`
- `app/admin/packages/[id]/ledger/page.tsx`
- `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
- `app/admin/layout.tsx`
- `app/admin/manager/quality/page.tsx`
- `app/admin/manager/quality/_components/ManagerQualityPrintButton.tsx`
- `lib/manager-quality-workspace.ts`

## Verification

- `npm run build`

## Risk

- Manual ledger correction workflows now use the ledger sum as the source of truth for `remainingMinutes` after edits. This is intended to prevent drift, but any existing abnormal correction should still be reviewed with academic evidence before relying on the final balance.
