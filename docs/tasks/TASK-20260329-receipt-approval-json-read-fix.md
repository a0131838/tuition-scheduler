# TASK-20260329 Receipt Approval JSON Read Fix

## Goal
- Restore receipt approval behavior after the `AppSetting` optimistic-lock rollout by correctly hydrating stored approval arrays.
- Fix the case where manager/finance approval state was read as empty even though JSON rows already existed in `AppSetting`.

## Scope
- `lib/parent-receipt-approval.ts`
- `lib/partner-receipt-approval.ts`
- `lib/partner-settlement-approval.ts`
- `tests/billing-optimistic-lock.test.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval route structure, permission checks, or approval order.
- Do not change the stored JSON shape.
- Only fix how existing JSON arrays are parsed after optimistic-lock reads.

## Validation
1. `npm run test:backend` passes.
2. `npm run build` passes.
3. Stored receipt approval JSON rows are returned by the approval map instead of being treated as empty.

## Status
- Ready to deploy on the current production branch lineage.
