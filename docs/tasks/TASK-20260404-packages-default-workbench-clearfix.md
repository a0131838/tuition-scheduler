# TASK-20260404-packages-default-workbench-clearfix

## Goal

Fix package-workbench "Back to default workbench" shortcuts so they clear remembered filters instead of reloading the same remembered package state.

## Why

- Production QA reproduced a dead-loop in the packages workbench.
- `/admin/packages` correctly resumed remembered filters, but the banner shortcut still linked to bare `/admin/packages`.
- Operators clicking "Back to default workbench" stayed inside the same remembered filter state instead of returning to the default package desk.

## Scope

- Route package-workbench default-reset shortcuts through `clearFilters=1`
- Keep remembered package filters active only when operators actually reopen the page without an explicit clear intent

## Non-Goals

- No changes to package query rules
- No changes to package billing, ledger, top-up, edit, or delete behavior
- No changes to remembered-state behavior on other workbenches in this hotfix

## Risks

- Low; this only changes package reset links to use the existing explicit clear path

## Validation

- `npm run build`
- production QA must confirm the bug before the fix: `/admin/packages` resumes remembered `paid=unpaid`, and the banner shortcut points to bare `/admin/packages`
- post-deploy QA must confirm `Back to default workbench` clears remembered package filters and returns to the default package desk
- post-deploy startup check confirms `local / origin / server` alignment and `/admin/login => 200`

## Release

- Release line: `2026-04-04-r07`
- Status: `READY`
