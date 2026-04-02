# TASK-20260402 Packages Context Return

## Goal

Make the admin packages workbench feel more task-oriented by keeping operators anchored to the package they just edited or topped up, and by giving them a clear next step after a delete refreshes the list.

## Scope

- `app/admin/packages/page.tsx`
- `app/admin/_components/PackageEditModal.tsx`
- release documentation updates for the same ship

## Changes

1. Edit flow
- after saving package edits, keep the same filtered packages queue
- highlight the handled package row when it is still visible
- show a flow card with shortcuts to the same package row, billing, and ledger

2. Top-up flow
- after saving a top-up, keep the same queue and highlight the same package row
- show a flow card that emphasizes the updated balance and offers direct billing / ledger shortcuts

3. Delete flow
- after deleting a package, refresh the same queue instead of leaving the operator without context
- show a flow card with a shortcut to the next visible package when one exists

4. Package row anchors
- add stable `package-row-*` anchors for package rows
- use URL params instead of transient local state so refreshes keep the same context

## Non-goals

- no package validation rule changes
- no package edit rule changes
- no top-up balance math changes
- no delete semantics changes
- no billing or ledger contract changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3314` confirmed:
  - `edited` flow shows `Package changes saved.` plus `Jump to this package / Open billing / Open ledger`
  - `topup` flow shows `Top-up saved.` plus `Jump to updated balance / Open billing / Open ledger`
  - `deleted` flow shows `Package deleted.` plus `Open next visible package`
- source verification confirmed package rows now render stable `package-row-*` anchors and focus styling when return params are present

## Release notes

- Release ID: `2026-04-02-r10`
- Risk: low
- Rollback: revert this release if package actions stop preserving queue context, if the wrong package row highlights after a refresh, or if package flow cards point operators to the wrong billing / ledger target
