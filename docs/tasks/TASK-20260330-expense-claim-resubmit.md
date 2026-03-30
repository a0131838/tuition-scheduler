# TASK-20260330 Expense Claim Resubmit

## Goal
- Allow rejected expense claims to be corrected and resubmitted without creating a second claim.
- Keep the existing approval and finance flow unchanged after the claim returns to `SUBMITTED`.

## Scope
- `lib/expense-claims.ts`
- `app/teacher/expense-claims/page.tsx`
- `tests/expense-claims.test.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not allow direct `REJECTED -> APPROVED`.
- Do not change finance payment or archive rules.
- Only the original teacher-facing claim flow should gain a resubmit path.

## Validation
1. `npm run test:backend` passes.
2. `npm run build` passes.
3. Rejected claims can move back to `SUBMITTED` after resubmit.
4. Non-rejected claims cannot use the resubmit path.

## Status
- Ready to deploy on the current production branch lineage.
