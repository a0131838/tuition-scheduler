# TASK-20260416-admin-ux-patterns-phase-2

## Goal

Push the next layer of admin UX improvements so the busiest list and workbench pages feel more stable, more consistent, and easier to scan during repeated daily use.

## Why

- The earlier admin UI pass improved structure and work-map navigation, but there was still room to make the system feel less tiring during real repeated operations.
- Users specifically want less “where was I?” friction: remembered filters, better return paths, clearer status language, and more stable split layouts.
- Mature internal tools benefit more from gradual consistency improvements than from full redesigns.

## Scope

- Add shared admin UX building blocks:
  - `WorkbenchStatusChip`
  - `WorkbenchFormSection`
  - `WorkbenchSplitView`
  - shared table/list support styles
- Extend remembered desk behavior to more list pages:
  - tickets
  - teachers
  - classes
  - students scroll memory
- Improve high-frequency pages with clearer state and action hierarchy:
  - approvals
  - tickets
  - teachers
  - classes
  - expense claims
  - receipts approvals
- Use the shared status chip system to distinguish:
  - current state
  - risk/blocker state
  - queue state
  - linked/not-linked style statuses
- Reduce button noise where possible by grouping lower-priority links and making the main action more obvious.
- Make split workbench panes more stable so long left-side queues do not visually crush or confuse the right detail pane.

## Non-Goals

- Do not change approval rules, ticket rules, finance rules, receipt rules, scheduling rules, or teacher feedback timing rules.
- Do not redesign the admin product from scratch.
- Do not alter role permissions, routing rules, or backend calculations.

## Risks

- Low to medium: this is still UI-only work, but it touches high-frequency admin pages and shared helper components.
- Main watchpoint: remembered filters must not create confusing “stuck” states when the user intentionally clears the desk.

## Validation

- `npm run build`
- Confirm:
  - ticket, teacher, and class desks can resume or clear remembered filters cleanly
  - approvals/tickets/receipts now use clearer shared status chips
  - expense claims review and finance panes use the shared split-view treatment without changing workflow behavior
  - students list now also remembers scroll position
  - no business logic behavior changed while these UX updates were added
