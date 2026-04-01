# TASK-20260401-package-create-flow-clarity

## Summary
- Make the admin package-create modal less error-prone by replacing the single long form with a guided step-by-step flow and a live summary card.

## Scope
- `app/admin/packages/PackageCreateFormClient.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- split package creation into four steps: student/course, balance/payment, validity/rules, and final review
- keep a live `Package summary / 课包摘要` card visible while filling the form
- move shared students, shared courses, and note fields into an advanced section
- keep the create API payload, package rules, and ledger writes unchanged

## Validation
- `npm run build`

## Status
- Completed and deployed.
