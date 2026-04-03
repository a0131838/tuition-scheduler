# TASK-20260403-student-package-balance-report-separate-page

## 1) Request

- Request ID: `2026-04-03-student-package-balance-report-separate-page`
- Requested by: user follow-up after the balance-report preview and badge passes
- Date: `2026-04-03`
- Original requirement: put the student package month-end balance report on its own page instead of mixing it into the student package invoice workbench.

## 2) Scope Control

- In scope:
  - `app/admin/finance/student-package-balances/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - release docs for this ship
- Out of scope:
  - report calculation changes
  - CSV export changes
  - amount-basis ledger logic
  - invoice issuance workflow changes
  - finance approval or receipt behavior
- Must keep unchanged:
  - month-end balance report math
  - CSV export fields and route
  - package purchase / top-up amount-basis tracking
  - student package invoice creation flow

## 3) Findings

- Root cause: finance asked for the month-end balance report to live as a standalone report because mixing reporting and invoice issuance on the same page made the workflow harder to scan.
- Affected modules:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - admin finance navigation / entry points
- Impact level: Low.

## 4) Plan

1. Create a dedicated finance page for the student package month-end balance report.
2. Move the report UI, preview, summary cards, badge legend, and export entry to the new page without changing its data basis.
3. Replace the invoice-page report block with a simple jump card and wire the new route into finance navigation and the admin finance home.

## 5) Changes Made

- Files changed:
  - `app/admin/finance/student-package-balances/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-balance-report-separate-page.md`
- Logic changed:
  - added a standalone finance report page for student package month-end balances
  - moved the inline preview, summary cards, and amount-basis legend to the new page
  - left a navigation card on the invoice workbench pointing finance to the report page
  - added sidebar and finance-home links to the new report page
- Logic explicitly not changed:
  - no report math changes
  - no CSV export changes
  - no package ledger basis changes
  - no invoice issue flow changes
  - no receipt or approval changes

## 6) Verification

- Build:
  - `npm run build`
- Runtime:
  - post-deploy startup check
  - production read-only QA on the new report route and the updated invoice route
- Key manual checks:
  - `/admin/finance/student-package-balances` renders the month-end report UI and export link
  - `/admin/finance/student-package-invoices` no longer embeds the report preview block
  - finance sidebar and finance home link to the new route

## 7) Risks / Follow-up

- Known risks:
  - this is routing and presentation only, so the main risk is navigation confusion if any old bookmarks still point operators to the invoice page expecting the report
- Follow-up tasks:
  - if finance wants, add a dedicated quick link from the finance workbench cards area as well

## 8) Release Record

- Release ID: `2026-04-03-r17`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r17`
