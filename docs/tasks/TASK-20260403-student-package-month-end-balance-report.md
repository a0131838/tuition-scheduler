# TASK-20260403-student-package-month-end-balance-report

## 1) Request

- Request ID: `2026-04-03-student-billing-month-end-balance`
- Requested by: finance request relayed by user
- Date: `2026-04-03`
- Original requirement: add a report format under student billing so finance can generate remaining course balance in hours and amount as of every month end.

## 2) Scope Control

- In scope:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `lib/student-package-month-end-balance.ts`
  - release docs for this ship
- Out of scope:
  - package deduction logic
  - invoice / receipt / approval logic
  - package data model changes
  - audit-grade historical price reconstruction
  - `MONTHLY` and `GROUP_COUNT` package reporting
- Must keep unchanged:
  - current package balance behavior
  - `PackageTxn` write paths
  - student billing issuance flow
  - receipt approval and finance workbench logic

## 3) Findings (Read-only Phase)

- Root cause: finance had no month-end export for remaining package balance; the current student billing page only shows current paid/invoiced summary for a selected package.
- Affected modules:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `prisma/schema.prisma` (`CoursePackage`, `PackageTxn`)
  - `app/admin/packages/[id]/ledger/page.tsx`
- Impact level: Medium. This blocks a recurring finance reporting task, but the fix can stay read-only.

## 4) Plan (Before Edit)

1. Reuse existing `CoursePackage` + `PackageTxn` history to reconstruct month-end remaining hours for `HOURS` packages only.
2. Add a CSV export route under `/api/exports` with a finance-safe read-only calculation.
3. Add a month-end report block under student billing with explicit copy about scope and amount-basis rules.

## 5) Changes Made

- Files changed:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `lib/student-package-month-end-balance.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-report.md`
- Logic changed:
  - added a read-only month-end balance helper that reconstructs purchased / used / remaining minutes up to a selected month end from `PackageTxn`
  - added CSV export for `HOURS` packages with estimated remaining amount
  - added a month-end report section under student billing with month picker, export link, and scope/basis explanation
- Logic explicitly not changed:
  - no package deduction writes
  - no receipt / invoice / approval writes
  - no package schema changes
  - no partner settlement changes

## 6) Verification

- Build:
  - `npm run build`
- Runtime:
  - local logged-in QA on `http://127.0.0.1:3322/admin/finance/student-package-invoices?balanceMonth=2026-03`
  - local export QA on `http://127.0.0.1:3322/api/exports/student-package-month-end-balance?month=2026-03`
- Key manual checks:
  - student billing page shows the new `Month-end balance report / 月末余额报表` block
  - export returns `200` with CSV headers and package rows
  - current invoice preview / issue flow remains intact

## 7) Risks / Follow-up

- Known risks:
  - version 1 amount is a management estimate, not an audit-grade historical pricing reconstruction
  - amount basis prefers receipts up to month end, otherwise falls back to current package `paidAmount`
  - `MONTHLY` and `GROUP_COUNT` packages are intentionally excluded from version 1
- Follow-up tasks:
  - if finance needs audit-grade amount history, extend package ledger to persist amount deltas per purchase / top-up
  - consider adding on-page preview table, not only CSV export

## 8) Release Record

- Release ID: `2026-04-03-r13`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r13`
