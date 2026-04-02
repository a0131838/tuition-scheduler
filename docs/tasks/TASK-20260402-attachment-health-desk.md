# TASK-20260402 Attachment Health Desk

## Goal

Turn the existing upload-recovery page into a real admin attachment-health workbench so operators can see missing-file anomalies across finance and operations in one place, then jump back into the right workflow without rebuilding context.

## Scope

- `app/admin/recovery/uploads/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- release documentation updates for the same ship

## Changes

1. Attachment-health workbench
- restyle `/admin/recovery/uploads` into a first-screen workbench with:
  - summary metrics
  - source filters
  - source workflow guide
  - next-step shortcuts
- keep the existing recovery/upload-backfill action intact

2. Source-aware anomaly navigation
- add direct entry points from:
  - receipt proof issues
  - expense attachment issues
- let each entry open the global attachment-health desk with the matching source filter

3. Finance access + navigation
- allow finance users to open `/admin/recovery/uploads`
- add a low-noise finance-nav entry for the attachment-health desk
- keep existing finance queue pages and local repair loops unchanged

## Non-goals

- no attachment storage rule changes
- no recovery matching rule changes
- no receipt approval logic changes
- no expense approval logic changes
- no ticket workflow logic changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3321` confirmed:
  - `/admin/recovery/uploads` renders the new `Attachment Health Desk` workbench
  - `/admin/recovery/uploads?source=expense` keeps the source filter and shortcut blocks intact
  - `/admin/receipts-approvals` shows the new `Open attachment health desk` entry
  - `/admin/expense-claims` shows the new `Open attachment health desk` entry

## Release notes

- Release ID: `2026-04-02-r18`
- Risk: low
- Rollback: revert this release if finance users are redirected away from `/admin/recovery/uploads`, if the new workbench hides existing recovery/backfill behavior, or if receipt/expense anomaly links stop returning operators to the correct workflow family
