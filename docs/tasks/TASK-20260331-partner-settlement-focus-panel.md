# TASK-20260331-partner-settlement-focus-panel

## Summary

- Add a focused working panel and lightweight filtering tools to the partner settlement page so finance and management can process one item at a time without scanning every table.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes

- Extend the page query string with lightweight view helpers:
  - `focusType`
  - `focusId`
  - `history`
- Add a sticky `Selected item / 当前处理项` panel that summarizes the currently focused queue item.
- Add `Focus / 聚焦` actions to:
  - pending billing records
  - online pending rows
  - offline warning rows
  - offline pending rows
- Add an `Integrity workbench / 异常工作台` section with direct links to:
  - repair report
  - todo center
- Add billing history filters:
  - `All history / 全部历史`
  - `Invoice only / 仅已开票`
  - `Receipt created / 仅已开收据`

## Non-Goals

- No settlement rule changes
- No invoice logic changes
- No permission changes
- No financial calculation changes

## Verification

- `npm run build`
- Confirm focus links drive the sticky selected-item panel
- Confirm billing history filters update the displayed invoiced rows

## Status

- Completed locally and deployed to production.
