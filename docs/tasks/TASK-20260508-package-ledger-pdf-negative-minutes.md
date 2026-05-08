# TASK-20260508-package-ledger-pdf-negative-minutes

## Context

Ops reported that a package-ledger PDF export showed each deduction as `-2h 30m`, while the website ledger showed `-1h 30m`.

## Findings

- The real Dong Xinyi AEIS package ledger stores each lesson deduction as `-90` minutes.
- The PDF running balance also decreases by 1h30m per deduction.
- The PDF export used a negative-minute formatter based on `Math.floor(min / 60)`, so `-90` rendered as `-2h 30m`.
- The website ledger already used absolute minutes plus a separate sign, so it rendered correctly.

## Scope

- Share the correct package-ledger minute formatter between the website ledger and PDF export.
- Add tests for negative and positive minute display.
- Do not change transaction records, balances, attendance, scheduling, billing, settlements, payroll, expense claims, or OpenClaw.

## Verification

- `npx tsx --test tests/package-ledger-format.test.ts`
- `npm run build`

## Deployment

- Status: ready for deploy.
- Post-deploy: re-export the affected package ledger PDF and confirm deduction rows show `-1h 30m`.
