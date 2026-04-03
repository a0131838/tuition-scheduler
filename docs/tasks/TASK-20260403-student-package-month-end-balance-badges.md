# TASK-20260403-student-package-month-end-balance-badges

## 1) Request

- Request ID: `2026-04-03-student-billing-month-end-balance-badges`
- Requested by: user follow-up after the month-end ledger-basis release
- Date: `2026-04-03`
- Original requirement: make the amount-basis source easier for finance to scan by showing clearer visual cues on the month-end balance report.

## 2) Scope Control

- In scope:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - release docs for this ship
- Out of scope:
  - report calculation changes
  - export route changes
  - package ledger write-path changes
  - billing / receipt / approval behavior
- Must keep unchanged:
  - month-end balance report math
  - CSV export contents
  - package purchase / top-up ledger amount history logic

## 3) Findings

- Root cause: finance can now see the amount-basis source, but plain text still forces operators to read each row rather than scan visually.
- Affected modules:
  - `app/admin/finance/student-package-invoices/page.tsx`
- Impact level: Low.

## 4) Plan

1. Add a small on-page legend that shows all supported amount-basis source states.
2. Render each row’s basis source as a color-coded badge instead of plain text.
3. Keep all report math and export behavior unchanged.

## 5) Changes Made

- Files changed:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-badges.md`
- Logic changed:
  - added color-coded amount-basis badges for `purchase ledger`, `receipts`, `package paid amount`, and `none`
  - added a compact badge legend above the preview table
- Logic explicitly not changed:
  - no report formula changes
  - no export field changes
  - no package ledger write changes
  - no billing or approval changes

## 6) Verification

- Build:
  - `npm run build`
- Runtime:
  - post-deploy startup check
  - production read-only page check on student billing
- Key manual checks:
  - legend renders all 4 source states
  - table rows show source as badges instead of plain text
  - export remains available from the same page

## 7) Risks / Follow-up

- Known risks:
  - this is presentation-only, so the main risk is visual clutter if too many pills appear at once
- Follow-up tasks:
  - if finance wants even faster scanning, add source-specific row grouping or filter chips later

## 8) Release Record

- Release ID: `2026-04-03-r16`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r16`
