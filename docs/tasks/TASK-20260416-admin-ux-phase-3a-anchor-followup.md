# TASK-20260416-admin-ux-phase-3a-anchor-followup

## Goal

Close the real QA issues found right after the phase-3 admin UX pass.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- `app/admin/conflicts/page.tsx`

## What Changed

1. Added `scrollMarginTop` to the partner-settlement `action-queue` target so work-map jumps stop landing under the sticky controls.
2. Made the conflicts page always expose a `#conflict-results` target, even when there are zero conflicts, so the work-map link never points to a missing section.
3. Added the same top-offset treatment to the conflicts results anchor so jump navigation lands in a readable position.

## Validation

- `npm run build`
- real browser QA on the two affected anchor links

## Risk Notes

- UI-only follow-up.
- No conflict rules, settlement rules, or scheduling logic changed.
