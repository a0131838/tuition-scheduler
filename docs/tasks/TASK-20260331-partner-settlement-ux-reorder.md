# TASK-20260331-partner-settlement-ux-reorder

## Summary

- Reorder the partner settlement page so the first screen focuses on current pending work instead of mixing setup, history, and daily actions together.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes

- Keep the settlement month selector and billing workspace entry at the top.
- Keep the overview cards, but add quick links into the related queue/history sections.
- Add a `What needs action now / 当前待处理` section ahead of the operational tables.
- Move `Pending billing records / 待开票记录` ahead of online/offline pending tables.
- Move invoiced history into a collapsed `Billing history / 开票历史` section.
- Move rate settings and package mode configuration into a collapsed `Settlement setup / 结算配置` section.
- Update headings and helper copy to be more action-oriented and bilingual.

## Non-Goals

- No settlement logic changes
- No permission changes
- No invoice, receipt, approval, or revert rule changes
- No data model changes

## Verification

- `npm run build`
- Confirm the partner settlement page shows pending work before history/setup
- Confirm setup sections are collapsed by default

## Status

- Completed locally and deployed to production.
