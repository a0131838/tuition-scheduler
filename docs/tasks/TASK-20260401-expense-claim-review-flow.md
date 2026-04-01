# TASK-20260401-expense-claim-review-flow

## Summary

- Rework the admin expense-claim review page so management can process high submission volume without scanning one large table.

## Scope

- Add a dedicated `My review queue / 我的审批队列` for submitted claims.
- Add a `Selected claim / 当前处理项` review panel with attachment preview and main actions.
- Add `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条`.
- Keep the full claim list available in a collapsed details/history section.

## Files

- `app/admin/expense-claims/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run build`

## Status

- Completed and deployed to production.
