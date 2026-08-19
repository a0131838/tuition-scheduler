# TASK-20260820-navigation-simplification

## Context

The Admin and Teacher sidebars had grown into long, always-visible lists. Staff had to scan unrelated areas, repeated links and finance entries before reaching their daily work.

## Change

- Reorganised the Admin sidebar into six task-based groups and the Teacher sidebar into three task-based groups.
- Added menu search, one-group-at-a-time expansion and remembered group state.
- Added up to four local browser favourites for Admin navigation.
- Kept every existing Admin destination and retained the existing server-side role filtering.
- Kept Renewal Follow-up visible to operations administrators while finance navigation remains unavailable to them.
- Added the unified My HR entry to eligible Admin, finance and Teacher navigation.
- Made desktop rows compact and kept the existing collapsed mobile menu behaviour.

## Non-goals

- No route permission, business workflow, database, finance, attendance, package, payroll, contract or scheduling rule changed.
- No user-specific favourite is written to the database; favourites remain local to the browser.

## Verification

- `npx tsc --noEmit`
- `npx tsx --test tests/navigation-information-architecture.test.ts tests/operations-admin-access.test.ts tests/hris.test.ts` (21/21 passed)
- `npm run build` (259/259 pages)
- Owner, Jessika operations-admin and Teacher Portal browser checks passed with no console errors.
- Desktop and 390 x 844 mobile screenshots showed no navigation overlap.

## Risk

Low. The change is limited to navigation presentation and grouping; route access continues to use the existing server-side permission checks.
