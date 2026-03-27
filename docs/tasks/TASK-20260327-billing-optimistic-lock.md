# TASK-20260327 Billing Optimistic Lock

## Goal
- Reduce lost-update risk in `partner/parent billing` and approval flows that currently persist JSON blobs in `AppSetting`.
- Keep current business structure intact while adding optimistic-lock retries and regression coverage.

## Scope
- `lib/app-setting-lock.ts`
- `lib/partner-billing.ts`
- `lib/student-parent-billing.ts`
- `lib/partner-settlement-approval.ts`
- `lib/partner-receipt-approval.ts`
- `lib/parent-receipt-approval.ts`
- `tests/app-setting-lock.test.ts`
- `tests/billing-optimistic-lock.test.ts`
- `package.json`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change invoice / receipt / approval data shape.
- Do not change frontend routes, request payloads, or page behavior.
- Only harden `AppSetting` JSON writes with conditional-save + retry semantics.
- Conflicting concurrent writes may now fail explicitly instead of silently overwriting each other.

## Validation
1. `npm run test:backend` passes.
2. `npm run build` passes.
3. Parent invoice creation preserves concurrent writes after optimistic-lock retry.
4. Partner settlement reject keeps latest state reconciliation after optimistic-lock retry.

## Status
- Ready for deploy on the production branch lineage.
