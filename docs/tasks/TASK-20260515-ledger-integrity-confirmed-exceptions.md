# TASK-20260515 Ledger Integrity Confirmed Exceptions

## Context

The admin layout showed `Ledger Integrity Alert / 课包对账告警` for three historical package ledger rows after Academic confirmed the underlying classes should remain deducted. These rows were not new operational errors: their package transaction notes explicitly recorded Academic confirmation and the reversal of mistaken orphan rollback rows.

## Scope

- Update the daily ledger-integrity scanner so academically confirmed historical orphan rollback reversals do not count as active red mismatch alerts.
- Keep the underlying package transactions and audit notes unchanged.
- Keep unconfirmed ledger/session mismatches and attendance deductions without package binding in the active alert count.

## Files

- `scripts/reconciliation/daily-ledger-integrity.ts`

## Verification

- `npx tsx scripts/reconciliation/daily-ledger-integrity.ts`
- `npm run build`

## Risk

Low to medium. This is an alert-classification change only. It does not change balances or ledger rows, but operators should still review any new mismatch that lacks explicit Academic confirmation.
