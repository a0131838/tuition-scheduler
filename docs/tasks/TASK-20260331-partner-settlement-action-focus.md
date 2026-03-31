# TASK-20260331-partner-settlement-action-focus

## Summary

- Refine the partner settlement page so the focus panel reads like direct next actions and the integrity workbench shows grouped warning counts at a glance.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes

- Update selected-item primary action copy to be more direct:
  - `Review billing record / 处理这条开票记录`
  - `Create online settlement / 生成线上结算`
  - `Create offline settlement / 生成线下结算`
  - `Fix attendance issues / 修复点名异常`
- Add grouped warning summary cards in the integrity workbench for:
  - missing feedback rows
  - status-excluded rows

## Non-Goals

- No settlement rule changes
- No invoice flow changes
- No permission changes
- No financial calculation changes

## Verification

- `npm run build`
- Confirm selected-item primary actions read as direct next steps
- Confirm integrity workbench shows grouped warning summaries

## Status

- Completed locally and deployed to production.
