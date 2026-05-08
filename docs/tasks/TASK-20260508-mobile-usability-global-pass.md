# TASK-20260508-mobile-usability-global-pass

## Context

Some SGT Manage pages are difficult to use on phones because dense admin and finance layouts were primarily optimized for desktop. The first pass should improve shared mobile behavior without changing business logic.

## Scope

- Improve the shared responsive layout used by admin and teacher pages.
- Keep desktop layout unchanged.
- Make phone-sized layouts stack dense grids into one column.
- Make filter bars and form controls easier to tap on mobile.
- Keep wide tables contained inside their own horizontal scroll areas instead of forcing the whole page sideways.
- Improve mobile drawer sizing and sticky top navigation behavior.

## Files Changed

- `app/responsive-layout.css`

## Out Of Scope

- No scheduling, attendance, package, billing, settlement, payroll, expense, notice, or OpenClaw logic changes.
- No database or data migration changes.
- No per-page redesign of complex tables into custom cards yet.

## Verification

- `npm run build`

## Risk

Low to medium. This is CSS-only and shared across authenticated pages, so it can affect layout density on small screens. Desktop behavior is unchanged, and the mobile rules are limited to `max-width: 900px` and `max-width: 640px`.
