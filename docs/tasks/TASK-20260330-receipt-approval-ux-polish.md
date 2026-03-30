# TASK-20260330 Receipt Approval UX Polish

## Goal
- Make the receipt approval page easier to operate by reducing on-screen clutter.
- Keep business rules unchanged while making review status, main actions, and secondary tools easier to scan.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change finance/create/upload data flow.
- Only restructure queue presentation, action emphasis, and bilingual wording in the approval page.

## Validation
1. `npm run build` passes.
2. Queue rows show simplified human-readable bilingual status and one clearer primary action.
3. Selected receipt panel emphasizes current item and main review actions.
4. Fix/revoke/package-billing tools move under `More actions / 更多操作`.

## Status
- Ready to deploy on the current production branch lineage.
