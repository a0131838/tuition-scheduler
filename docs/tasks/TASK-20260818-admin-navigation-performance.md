# TASK-20260818 — Admin navigation and Ticket Center performance

## Goal

Make the existing web administration pages respond quickly enough for daily operations without changing any business workflow, formal record or miniapp feature.

## Observed problem

- Opening many admin pages repeated the complete approval-inbox calculation in the shared layout.
- Ticket filtering reloaded the document and materialized up to 200 ticket rows plus related actions before rendering.
- Today/Todos repeated overlapping session, enrollment and attendance reads for today, yesterday and overdue buckets.
- Slow routes had no immediate loading feedback, encouraging duplicate clicks.

## Implemented changes

1. Shared admin shell
   - Run independent language, role, ledger-alert and navigation-badge reads concurrently.
   - Cache only the shared approval badge for 20 seconds.
   - Keep the real approval page on the existing uncached source of truth.

2. Ticket Center
   - Use Next.js in-app form navigation and preserve the current filters.
   - Let the browser complete the native GET submission before disabling the filter button and displaying `正在筛选…`.
   - Fetch 51 records, render 50 and use the extra record only to determine whether a next page exists.
   - Preserve ticket content, permissions, statuses, AI advice and manual execution.

3. Today/Todos
   - Query the shared historical session window once, then derive its display buckets without more database reads.
   - Query enrollment and attendance once each for that same window and reuse the maps for all buckets.
   - Keep existing ordering, thresholds, reminders and actions unchanged.

4. Loading feedback
   - Add an accessible admin-route loading screen with a clear instruction not to click repeatedly.

## Explicit non-goals

- No change to scheduling or conflict rules.
- No change to class hours, packages, attendance, payroll, finance or notifications.
- No database migration.
- No miniapp source or package change.
- No change to the formal approval inbox contents.

## Verification

- `npm run build` generated 251/251 pages.
- 34/34 focused navigation and ticket regression tests passed.
- `tests/admin-navigation-performance.test.ts` locks the new bounded/cached query structure.
- Full repository regression suite passed 565/565; release-doc gate and guarded server deployment are required before release completion.
- Production browser replay caught and corrected a submit-state race: the pending UI now begins on the next event-loop turn, after the native form action has already started.

## Rollback

Rollback to `511d64f5ec94c886e638496dab851dadc59e6527`. No data rollback is required because this release has no migration and creates no new business records.
