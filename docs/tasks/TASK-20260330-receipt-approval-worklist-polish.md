# TASK-20260330 Receipt Approval Worklist Polish

## Goal
- Make the receipt approval page feel more like a working queue instead of a passive list.
- Keep business rules unchanged while helping operators focus on the next item that actually needs action.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change receipt creation, billing linkage, or finance data flow.
- Only improve queue ordering and bilingual operator feedback on the review page.

## Validation
1. `npm run build` passes.
2. Pending risky items sort ahead of completed items in the receipt approval queue.
3. Success messages explain the action result and next-item jump in bilingual wording.
4. Risk boxes include bilingual suggested next steps.

## Status
- Ready to deploy on the current production branch lineage.
