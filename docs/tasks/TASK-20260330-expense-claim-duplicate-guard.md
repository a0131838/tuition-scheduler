# TASK-20260330 Expense Claim Duplicate Guard

## Goal
- Stop repeated taps from creating many identical expense claims.
- Clean up the duplicated Ahmar transport claims created for `2026-03-29`.

## Scope
- `lib/expense-claims.ts`
- `app/teacher/expense-claims/page.tsx`
- `app/admin/expense-claims/page.tsx`
- `app/_components/ExpenseClaimForm.tsx`
- `app/_components/ExpenseClaimSubmitButton.tsx`
- `tests/expense-claims.test.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval rules, payment flow, or export behavior.
- Do not auto-edit historical claims whose files are already missing on disk.
- Only block short-window exact duplicates and improve submit-button behavior.

## Validation
1. `npm run test:backend` passes.
2. `npm run build` passes.
3. Exact duplicate expense submissions within the guard window are detected and not written again.
4. Ahmar duplicate `2026-03-29` transport claims are reduced to one kept row.

## Status
- Ready to deploy on the current production branch lineage.
