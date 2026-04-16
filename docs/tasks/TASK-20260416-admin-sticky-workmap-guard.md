# TASK-20260416-admin-sticky-workmap-guard

## Why

Real browser QA found that the large admin "work map / 工作地图" bars were implemented as wide, tall sticky panels. Once they stuck to the top of `.app-main`, the next content blocks scrolled underneath them and became partially hidden. The student detail page made the problem obvious, but the same pattern was present across many other admin workbench pages.

## Scope

- add one admin-layout client guard that detects oversized wide sticky work-map panels and downgrades them to normal flow blocks
- keep smaller sticky elements such as split-view detail panes and table headers untouched
- avoid touching approval, finance, scheduling, ticket, attendance, or teacher business logic

## Files

- `app/admin/layout.tsx`
- `app/admin/_components/WorkbenchStickyGuardClient.tsx`
- `docs/tasks/TASK-20260416-admin-sticky-workmap-guard.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- production-build browser check on the main affected admin pages:
  - student detail
  - approvals
  - expense claims
  - feedbacks
  - receipts approvals
  - todos
  - tickets
  - partner settlement
  - conflicts
  - teachers list/detail/availability
  - classes list/detail/sessions
  - finance workbench
  - attendance detail
- confirm the large work-map bar is no longer sticky on those pages
- confirm right-side sticky detail panes still remain sticky where expected

## Risk

Low. This is a UI-only guard at the admin layout layer. It changes how oversized sticky work-map panels behave while leaving all workflow data, routing, queue state, and business rules intact.
