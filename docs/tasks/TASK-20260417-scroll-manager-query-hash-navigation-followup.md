# TASK-20260417-scroll-manager-query-hash-navigation-followup

## Why

The first student calendar month-pager follow-up revealed the real root cause: the shared admin `ScrollManager` was treating same-path links with both a changed query string and a hash as if they were pure in-page anchor jumps. That meant links such as `?month=2026-05#calendar-tools` only updated browser history and scrolled, but did not let Next.js load the new server-rendered month. The issue surfaced on student detail calendar paging, but the fix belongs in the shared scroll interception layer.

## Scope

- stop the shared scroll manager from hijacking same-path links when the query string changes
- keep pure same-page hash jumps working as before when pathname and search stay the same
- remove the temporary student-detail month-pager client workaround
- restore the student-detail month pager to normal links once the shared interception layer is corrected

## Files

- `app/_components/ScrollManager.tsx`
- `app/admin/students/[id]/page.tsx`
- `docs/tasks/TASK-20260417-scroll-manager-query-hash-navigation-followup.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production browser check:
  - open student detail at `#calendar-tools`
  - click `Next Month / 下月` and confirm the rendered month changes
  - click `Prev Month / 上月` and confirm the rendered month changes back
  - confirm pure same-page hash jumps still scroll correctly

## Risk

Low. This changes only the shared scroll interception rule for same-path links. Pure anchor jumps on the same pathname and same search still work, while links that change query parameters are now allowed to navigate normally. No scheduling rules, calendar calculations, approval logic, or package logic change.
