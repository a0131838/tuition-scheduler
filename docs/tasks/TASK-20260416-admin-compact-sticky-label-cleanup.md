# TASK-20260416-admin-compact-sticky-label-cleanup

## Why

The compact sticky density reduction worked for student and ticket pages, but some workbenches such as expense claims still leaked count fragments into the shortcut labels because the label extractor did not always prefer the bold primary line. A small follow-up is needed so the sticky row stays clean across all pages.

## Scope

- improve compact sticky label extraction to prefer bold child headings before fallback text
- keep the light single-line sticky navigation style with `More / 更多`
- keep workflow logic, routing behavior, and business rules unchanged

## Files

- `app/admin/_components/WorkbenchStickyGuardClient.tsx`
- `docs/tasks/TASK-20260416-admin-compact-sticky-label-cleanup.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production browser check:
  - expense claims compact sticky labels no longer include waiting-row or visible-row count fragments
  - student detail and ticket center still keep the lighter sticky row with `More / 更多`
  - expense claims right detail pane remains sticky

## Risk

Low. This is a UI-only follow-up to the compact sticky density pass. It only changes how generated shortcut labels are selected from existing work-map links and does not affect queue logic, approvals, or routing behavior.
