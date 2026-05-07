# TASK 2026-05-07 Expense Claims All Paid Archive View

## Problem

Finance reported that after clicking `Paid / 已付款`, archived paid expense claims were no longer traceable from the normal paid list.

## Real Data Checked

- Paid active claims: 41
- Paid archived claims: 1
- Paid total claims: 42

## Change

- Add an `All paid expenses / 所有已付款报销` quick filter.
- Replace the old archived-only checkbox with an `Archive view / 归档视图` selector:
  - `Active only / 仅看未归档`
  - `Archived only / 仅看已归档`
  - `Include archived / 包含已归档`
- Make `status=PAID&archived=include` show all paid claims across active and archived records.
- Make CSV export follow the same archive-view filter.

## Not Changed

- Claim approval workflow
- Payment marking workflow
- Archive/unarchive state
- Receipt attachment storage
- Payroll
- Student billing
- Package deduction
- Scheduling
- Attendance
- Contracts
- Partner settlement
- OpenClaw

## Verification

- `npx tsx --test tests/expense-claims.test.ts`
- `npx tsc --noEmit`
- `npx next build`
- Real database count confirmed paid active 41, paid archived 1, paid total 42.
