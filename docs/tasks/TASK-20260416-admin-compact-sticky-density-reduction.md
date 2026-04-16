# TASK-20260416-admin-compact-sticky-density-reduction

## Why

The first compact sticky shortcut pass solved the overlap problem, but the generated bars still felt too dense because they kept too many links visible and preserved noisy labels with counts. The next pass should make the sticky row feel like lightweight navigation instead of a second miniature workbench.

## Scope

- slim the generated admin sticky shortcut row into a lighter single-line navigation style
- show only the first 3 shortcut links inline
- move the remaining links under a `More / 更多` menu
- strip counts and long status fragments from generated shortcut labels
- keep the original large work map visible in normal flow
- keep workflow logic, routing behavior, and business rules unchanged

## Files

- `app/admin/_components/WorkbenchStickyGuardClient.tsx`
- `docs/tasks/TASK-20260416-admin-compact-sticky-density-reduction.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production browser check:
  - student detail sticky shortcut row now shows at most 3 inline links plus `More / 更多`
  - ticket center sticky shortcut row now uses the same lighter format
  - expense claims sticky shortcut row stays light while the right detail pane remains sticky
  - the generated shortcut labels no longer include row counts or long status fragments

## Risk

Low. This is a UI-only density reduction on top of the existing compact sticky shortcut guard. It only changes how the generated shortcut row is presented and does not affect workflow, queue logic, approvals, or routing behavior.
