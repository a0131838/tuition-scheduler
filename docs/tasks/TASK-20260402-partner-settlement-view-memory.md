# TASK-20260402 Partner Settlement View Memory

## Goal

Reduce repeated setup on the admin partner-settlement workbench by remembering the operator's last month/history/panel context, then restoring that view when the page is reopened without explicit URL params.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- release documentation updates for the same ship

## Changes

1. Remembered partner-settlement view parsing
- add a small server-side parser for normalized workbench view state
- whitelist only:
  - `month`
  - `history`
  - `panel`
- keep flow-specific and focus-specific params out of the remembered state

2. Workbench resume logic
- restore the last remembered month/history/panel when `/admin/reports/partner-settlement` opens without explicit URL params
- keep explicit URL params higher priority than remembered state
- continue to suppress remembered restore on one-shot flow-return pages

3. Resume hint and panel restore
- show an explicit “resumed your last settlement view” hint when remembered state is used
- provide a direct shortcut back to the default workbench
- wire `panel=setup` into the setup disclosure so resumed setup context actually reopens the same section

## Non-goals

- no settlement math changes
- no settlement creation rule changes
- no invoice generation changes
- no revert behavior changes
- no approval behavior changes
- no focus-row / anchor return logic changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3317` confirmed:
  - `/admin/reports/partner-settlement` restores `month=2026-03&history=receipt-created&panel=history` from cookie when opened without URL params
  - `/admin/reports/partner-settlement` restores `month=2026-03&panel=setup` from cookie and opens the setup disclosure
  - the resumed-view banner renders on the plain workbench-open path and does not appear on `settlementFlow=rate-updated` return pages
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- logged-in live QA confirmed production `/admin/reports/partner-settlement` restores the remembered month/history/panel view and still suppresses the resume banner on settlement-flow return pages

## Release notes

- Release ID: `2026-04-02-r14`
- Risk: low
- Rollback: revert this release if `/admin/reports/partner-settlement` starts reopening the wrong month/history/panel view, if explicit URL params stop taking precedence over remembered state, or if settlement-flow return pages lose their flow-card guidance because the resume banner overrides them
