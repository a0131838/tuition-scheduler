# TASK 2026-05-09 Finance Tutor Cost Cut-off Export

## Goal

Finance needs to download tutor cost independently for the standard payroll cut-off period from the 15th to the end of each month.

## Scope

- Add a read-only finance page at `/admin/finance/tutor-cost-export`.
- Add an Excel export endpoint at `/api/exports/tutor-cost-cutoff?month=YYYY-MM`.
- Include only completed and confirmed sessions.
- Use the existing system teacher hourly rates and payroll completion logic.
- Include both teacher summary and session detail sheets.

## Out of Scope

- No payroll payment workflow changes.
- No changes to attendance marking, feedback submission, session scheduling, invoices, receipts, or package ledgers.
- No automatic finance approval or payout status changes.

## Verification

- `npx tsx --test tests/tutor-cost-cutoff.test.ts`
- `npx tsc --noEmit`
- Local page compile check for `/admin/finance/tutor-cost-export`.

## Rollback

Revert the release commit and redeploy the previous production commit.
