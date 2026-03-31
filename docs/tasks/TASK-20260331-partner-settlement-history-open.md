# TASK-20260331 Partner Settlement History Open

## Goal

Fix the partner settlement overview shortcut so `Open history / 打开历史` expands the billing history section instead of only jumping to the anchor.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- release docs only

## Changes

1. Add a lightweight `panel` query param to the partner settlement page.
2. Use `panel=history` for the overview history shortcut.
3. Open the `Billing history / 开票历史` details block when `panel=history` is present.

## Non-goals

- No change to settlement creation.
- No change to invoice history filters.
- No change to permissions or business rules.

## Validation

- `npm run build`

## Status

- Completed locally and deployed.
