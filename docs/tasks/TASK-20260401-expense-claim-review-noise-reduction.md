# TASK-20260401-expense-claim-review-noise-reduction

## Summary

- Reduce noise on the admin expense-claim review page after real QA exposed console 404s from collapsed-history thumbnails and too much pre-queue clutter.

## Scope

- Move `Follow-up reminders / 跟进提醒` into a collapsed summary block below the main review queue.
- Move `Submit a claim for myself / 为自己提交报销` into a lower-priority collapsed section at the bottom.
- Remove receipt thumbnail preloading from the collapsed full-history list.

## Files

- `app/admin/expense-claims/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run build`

## Status

- Completed and deployed to production.
