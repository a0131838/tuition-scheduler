# TASK-20260403-student-package-month-end-balance-preview

## 1) Request

- Request ID: `2026-04-03-student-billing-month-end-balance-preview`
- Requested by: user follow-up after month-end export release
- Date: `2026-04-03`
- Original requirement: make the new month-end balance report visible inside student billing as an on-page preview, not CSV export only.

## 2) Scope Control

- In scope:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - release docs for this ship
- Out of scope:
  - export route logic changes
  - package ledger write logic
  - invoice / receipt / approval logic
  - audit-grade historical amount tracking
- Must keep unchanged:
  - existing month-end CSV export behavior
  - student billing invoice preview / issue flow
  - package deduction and billing logic

## 3) Findings (Read-only Phase)

- Root cause: finance can export the report now, but still has to leave the page mentally blind before downloading; a small in-page preview reduces that friction.
- Affected modules:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `lib/student-package-month-end-balance.ts`
- Impact level: Low.

## 4) Plan (Before Edit)

1. Reuse the same month-end helper already used by the CSV export.
2. Add summary cards and a first-page preview table inside the month-end report block.
3. Keep page rendering read-only and leave the full dataset in CSV export.

## 5) Changes Made

- Files changed:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-preview.md`
- Logic changed:
  - month-end report block now shows package count, total remaining hours, estimated remaining amount, and the first 12 rows inline
  - page clearly tells users to use CSV for the full report
- Logic explicitly not changed:
  - no export-calculation change
  - no package write logic
  - no invoice / receipt / approval logic

## 6) Verification

- Build:
  - `npm run build`
- Runtime:
  - local source/build verification on student billing page
  - post-deploy startup check
- Key manual checks:
  - page shows inline month-end summary and preview rows
  - export link still points to the same full CSV route

## 7) Risks / Follow-up

- Known risks:
  - page now performs the same month-end helper read used by the export, so this adds read-only server work to the student billing page
- Follow-up tasks:
  - second phase: audit-grade historical amount basis with top-up/purchase amount deltas

## 8) Release Record

- Release ID: `2026-04-03-r14`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r14`
