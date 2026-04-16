# TASK-20260416-admin-compact-sticky-shortcuts

## Why

The first sticky work-map guard fixed the blocking issue by downgrading oversized sticky bars to normal flow blocks. That solved the overlap bug, but it also removed the convenience of having a small sticky jump strip while working down a long page. The next step is to keep the full work map in place while generating a compact sticky shortcut bar for the same actions.

## Scope

- extend the admin sticky guard so each downgraded oversized work-map panel gets a compact sticky shortcut bar directly after it
- keep the original large work-map content visible in normal flow
- keep narrow intentional sticky panes such as split-view detail panels unchanged
- do not change workflow logic, routing behavior, or any approval/finance/scheduling/ticket rules

## Files

- `app/admin/_components/WorkbenchStickyGuardClient.tsx`
- `docs/tasks/TASK-20260416-admin-compact-sticky-shortcuts.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production-build browser check:
  - student detail now shows a thin sticky shortcut row with the main section links
  - ticket center now shows a thin sticky shortcut row with overdue / intake / filters / list links
  - expense claims keeps its right sticky detail pane while the work-map area becomes a thin sticky shortcut row
- confirm the original large work map remains visible in normal flow on those pages

## Risk

Low. This is a UI-only follow-up on top of the existing sticky guard. It adds compact shortcut bars derived from existing links without changing any business workflow behavior.
