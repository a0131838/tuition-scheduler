# TASK-20260402 Partner Settlement Context Return

## Goal

Make the admin partner settlement workspace feel more task-oriented by keeping operators anchored to the month and queue item they just handled, while exposing a clear next step after rate edits, settlement creation, and settlement revert actions.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- release documentation updates for the same ship

## Changes

1. Rate settings flow
- after updating settlement rates, return to the same settlement month with an explicit success card
- provide direct shortcuts back to settlement setup and the live billing queue

2. Online settlement creation flow
- after creating an online settlement record, keep the new pending billing record highlighted
- show a flow card with direct shortcuts to the new billing record, billing workspace, and the next online queue item

3. Offline settlement creation flow
- after creating an offline settlement record, keep the new pending billing record highlighted
- show a flow card with direct shortcuts to the new billing record, billing workspace, and the next offline queue item

4. Revert flow
- after reverting a pending settlement record, refresh the same month view with a direct shortcut to the next billing record when one exists
- keep explicit shortcuts back to the online and offline action queues

5. Settlement row anchors
- add stable `partner-record-*`, `partner-online-*`, `partner-offline-*`, and `partner-warning-*` anchors
- use URL-based focus params so refreshes keep the same context instead of relying on transient scroll position

## Non-goals

- no settlement-rate value changes
- no settlement creation rule changes
- no revert business logic changes
- no billing, invoice, or payout contract changes
- no partner source or queue filtering rule changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3315` confirmed:
  - `online-created` flow shows `Online settlement record created.` plus `Open billing workspace / Open next online item`
  - `offline-created` flow shows `Offline settlement record created.` plus `Open billing workspace / Open next offline item`
  - `settlement-reverted` flow shows `Settlement record reverted.` plus `Back to online queue / Back to offline queue`
  - `rate-updated` flow shows `Settlement rates updated.` plus `Jump to setup / Back to live queue`
  - `focusType=online` and `focusType=offline` both land on stable highlighted queue rows with `partner-online-*` / `partner-offline-*` anchors
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `294e118` and `https://sgtmanage.com/admin/login` returned `200`
- logged-in live QA confirmed the same production page renders the `online-created`, `offline-created`, `settlement-reverted`, and `rate-updated` flow cards plus stable `partner-online-*` / `partner-offline-*` row anchors for `month=2026-04`

## Release notes

- Release ID: `2026-04-02-r11`
- Risk: low
- Rollback: revert this release if settlement actions stop preserving month/queue context, if the wrong queue row highlights after a refresh, or if the new flow cards point operators to the wrong billing or queue target
