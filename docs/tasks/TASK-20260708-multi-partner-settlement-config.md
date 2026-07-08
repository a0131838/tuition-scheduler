# TASK-20260708-multi-partner-settlement-config

## Context

The partner settlement flow was originally built around New Oriental as the only partner. New partners, starting with Shanghai Xin Zhuo Si, need the same settlement pattern without replacing or breaking New Oriental's existing records, rates, invoices, receipts, and payment-proof workflow.

## Change

- Added a `Partner` configuration table and a migration that seeds:
  - New Oriental / `新东方`
  - Shanghai Xin Zhuo Si / `上海新卓思`
- Backfilled existing New Oriental settlement records to the New Oriental Partner config.
- Added `/admin/partners` for admin users to create and update partner name, linked student source, Bill To, display name, online/offline rates, default lesson/package/top-up minutes, enabled settlement modes, and active status.
- Added partner selectors to partner settlement and billing workbenches.
- Scoped partner invoices, receipts, payment records, deleted invoice history, and pending settlement candidates by `partnerId`.
- Updated package top-up snapshots and ledger rollback protections so any student source bound to a Partner can use the partner online settlement flow.
- Extended partner-style 45-minute package UI and ticket source mapping to Shanghai Xin Zhuo Si.

## Non-goals

- Did not change parent billing, direct-billing contract flow, attendance deduction, scheduling, teacher payroll, transport billing, Business Accounts, or OpenClaw logic.
- Did not physically delete or rewrite legacy New Oriental billing JSON; legacy rows without `partnerId` remain visible only in the New Oriental view.
- Did not add public partner-specific intake URLs beyond the existing intake foundation.

## Verification

- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run test:backend`
- `npx prisma migrate deploy`
- Read-only Prisma check confirmed `新东方` and `上海新卓思` Partner configs exist and 32 legacy New Oriental settlement records are bound to `legacy-xdf-partner`.
- Local smoke checks compiled `/admin/reports/partner-settlement`, `/admin/reports/partner-settlement/billing`, and `/admin/partners`.
- `npm run build`

## Risk

Medium. The change adds a partner configuration table and threads partner scoping through settlement, billing, receipts, payment proofs, and package top-up snapshots. The risk is controlled by keeping `partnerId` nullable for legacy data, defaulting old partner-billing JSON to New Oriental only, and preserving existing New Oriental rates and Bill To values.
