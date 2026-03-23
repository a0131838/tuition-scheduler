# TASK-20260323 Ledger Report Clarity

## Goal
- Make ledger integrity detail report self-explanatory for school ops and finance reviewers.
- Show clear root cause and recommended action per anomaly row.

## Scope
- `scripts/reconciliation/daily-ledger-integrity.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Reporting output enhancement only.
- No change to attendance deduction execution logic.
- No schema migration.

## Validation
1. `npm run audit:ledger-integrity` runs successfully.
2. Output detail CSV contains:
   - `reasonCode`
   - `rootCauseCN` / `rootCauseEN`
   - `suggestedActionCN` / `suggestedActionEN`
3. Existing alert counts still compute correctly.

## Status
- In progress: deploy updated report script to server.
