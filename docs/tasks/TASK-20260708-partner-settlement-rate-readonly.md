# TASK-20260708 Partner Settlement Rate Read-Only

## Goal

Prevent partner settlement rates from being edited in two places.

## Change

- Removed the Partner Settlement page rate update server action.
- Replaced the rate inputs with read-only current-rate display.
- Added a link from Partner Settlement to Partner Setup for rate changes.
- Added copy clarifying that rate changes affect future settlement records, while existing generated records keep their saved amount.

## Verification

- `npx tsc --noEmit`
- `npm run build`

## Risk

Low. Settlement record creation and amount formulas are unchanged; only the duplicate rate-edit entry point was removed.
