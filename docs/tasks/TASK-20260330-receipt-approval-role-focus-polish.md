# TASK-20260330 Receipt Approval Role Focus Polish

## Goal
- Make unfinished receipt approval work stand out more clearly.
- Keep the existing business flow while reducing visual noise from completed items and making risk state easier to scan.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change receipt creation, billing linkage, or finance data flow.
- Only improve queue emphasis, risk badges, and current-role guidance on the review page.

## Validation
1. `npm run build` passes.
2. Completed rows render with lower visual priority in the queue.
3. Queue rows show bilingual risk badges.
4. Selected receipt panel shows current role focus in bilingual wording.

## Status
- Ready to deploy on the current production branch lineage.
