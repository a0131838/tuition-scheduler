# TASK-20260330 Receipt Approval Flow Smoothing

## Goal
- Make the receipt approval page faster to operate during repeated review work.
- Keep approval rules unchanged while reducing manual re-selection and making reject guidance more consistent.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change receipt creation, billing linkage, or finance data flow.
- Only improve queue-to-review flow, reject reason input, and review visibility in the approval page.

## Validation
1. `npm run build` passes.
2. Approve/reject/revoke actions can carry the operator to the next queue item.
3. Reject actions use standardized bilingual reason options plus optional detail.
4. Selected receipt panel shows a lightweight bilingual timeline for created / approved / rejected milestones.

## Status
- Ready to deploy on the current production branch lineage.
