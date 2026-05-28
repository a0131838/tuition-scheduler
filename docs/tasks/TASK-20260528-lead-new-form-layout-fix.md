# TASK 2026-05-28 Lead New Form Layout Fix

## Context

The Resource Follow-up new resource page showed a layout issue where the owner selector could overflow its grid column and visually collide with the intent selector.

## Shipped Scope

- Constrained new-resource form fields to the width of their grid column.
- Allowed form labels and controls to shrink inside responsive grid tracks.
- Kept the resource creation action, owner list, lead data model, and all downstream workflow logic unchanged.

## Verification

- `npm run build`

## Release

- Release ID: `2026-05-28-r157`
- Branch: `feat/strict-superadmin-availability-bypass`
