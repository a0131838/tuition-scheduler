# TASK-20260519-xdf-online-partial-closeout

## Request

Handle the New Oriental student 苏闻熹, whose online partner package was not fully consumed and whose parent no longer wants the remaining lessons, so the package can be cleared and settled.

## Real Data Baseline

- Student: 苏闻熹
- Source: 新东方学生
- Student type: 合作方学生
- Package: `ONLINE_PACKAGE_END`, `HOURS`, active before closeout
- Total minutes: 900
- Deducted attendance minutes: 810
- Remaining minutes observed in production: 90
- Existing partner settlements: none
- Future sessions: none

## Change

Allow online partner settlement candidates to include an `EXPIRED` package whose remaining minutes were forfeited, settling by the original full purchase tranche instead of requiring every minute to be physically consumed.

## Guardrails

- Active incomplete online partner packages remain excluded from settlement candidates.
- Fully consumed online partner packages keep the existing settlement behavior.
- The closeout note records forfeited minutes.
- 苏闻熹 should settle 900 purchased minutes = 15 hours = SGD 1400 at the current SGD 70 / 45-minute rate.
- No scheduling, attendance deduction, direct-billing invoice, receipt, payroll, or OpenClaw logic changes.

## Verification

- Read-only production data check for 苏闻熹 before making changes.
- `npx tsx --test tests/partner-settlement.test.ts`
- `npm run build`
- Post-deploy production check after the one-student data closeout.

## Rollback

Revert `2026-05-19-r150` if active incomplete New Oriental online packages start appearing as settlement candidates, if fully consumed online packages stop appearing, or if the partial closeout note/amount is wrong.
