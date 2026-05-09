# TASK 2026-05-09 Finance Tutor Cost Sidebar Entry

## Goal

Make the tutor cost export discoverable from the admin and finance left navigation.

## Scope

- Add `Tutor Cost Export / 老师成本导出` to the admin finance/review navigation.
- Add the same entry to the finance role navigation.
- Allow FINANCE users to access `/admin/finance/tutor-cost-export`.
- Add the workspace title label for the new route.

## Out of Scope

- No changes to tutor cost export calculations.
- No changes to payroll approvals, payouts, scheduling, attendance, billing, packages, or expense claims.

## Verification

- `npx tsc --noEmit`
- `npm run build`

## Rollback

Revert the release commit and redeploy the previous production commit.
