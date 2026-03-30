# TASK-20260330 Receipt Approval Bucketed Queue

## Goal
- Make the receipt approval queue easier to scan by grouping work into clearer buckets.
- Keep the existing approval flow unchanged while helping operators distinguish their next actions from history.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change receipt creation, billing linkage, or finance data flow.
- Only reorganize queue presentation into clearer bilingual sections.

## Validation
1. `npm run build` passes.
2. Queue renders separate sections for my next actions, other open items, and completed history.
3. Completed items are visually separated from unfinished work.
4. Selected receipt details and actions still behave the same.

## Status
- Ready to deploy on the current production branch lineage.
