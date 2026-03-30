# TASK-20260330 Receipt Approval Focus Filters

## Goal
- Make the receipt approval queue easier to focus during high-volume review work.
- Keep the existing approval flow unchanged while giving operators faster ways to narrow the queue.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change receipt creation, billing linkage, or finance data flow.
- Only improve queue summaries, focus filters, and history visibility on the review page.

## Validation
1. `npm run build` passes.
2. Queue header shows bilingual count summaries.
3. Operators can switch between all buckets, my actions, open work, and completed history.
4. Completed history is collapsed by default.

## Status
- Ready to deploy on the current production branch lineage.
