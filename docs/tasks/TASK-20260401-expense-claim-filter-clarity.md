# TASK-20260401-expense-claim-filter-clarity

## Summary
- Clarify how filters work on the admin expense-claim page by separating quick work filters from advanced filters and explicitly stating that both queues, the history list, and CSV export all follow the same filtered dataset.

## Scope
- `app/admin/expense-claims/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- add `Quick work filters / 工作流快速筛选` above the main queues
- move the detailed form into `Advanced filters and export / 高级筛选与导出`
- explain that filters affect review queue, finance queue, history, and export together

## Validation
- `npm run build`

## Status
- Completed and deployed.
