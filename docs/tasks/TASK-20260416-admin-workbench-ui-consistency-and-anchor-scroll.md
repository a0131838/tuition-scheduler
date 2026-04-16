# TASK-20260416-admin-workbench-ui-consistency-and-anchor-scroll

## Goal

Finish the current admin UI consistency pass so high-frequency workbenches are easier to stay in, easier to scan, and less likely to lose context while processing queues.

## Why

- The admin system had reached a mature but noisy state: users could usually finish work, but many pages still made them rescan, lose position, or guess the next step.
- Several queue pages used different success/error feedback patterns, which made repeated workflow actions feel inconsistent.
- Page-level work maps and remembered queue state were improved in earlier batches, but same-page anchor navigation inside the admin scroll container still did not reliably move to the target section.
- Users explicitly care about continuity: do not jump to the top, do not lose the selected item, and keep the next action obvious.

## Scope

- Add one shared `WorkbenchActionBanner` component for success, error, warning, and “next step” feedback.
- Add one shared sticky helper for workbench bars so key queue pages use the same sticky treatment.
- Apply the shared banner/sticky patterns to high-frequency admin workbenches:
  - approvals
  - todos
  - tickets
  - expense claims
  - teacher feedback desk
  - receipts approvals
- Add or extend scroll memory on the busiest queue pages so returning from actions does not throw the user back to the top.
- Fix same-page anchor navigation inside the admin `.app-main` scroll container by teaching the global scroll manager to scroll the real admin scroll surface instead of only changing the hash.
- Add `scrollMarginTop` or equivalent spacing to key anchor targets so sticky bars do not cover the target heading after jump navigation.
- Run local narrow-width QA on the main admin queue pages to confirm there is no obvious horizontal overflow or broken work-map navigation.

## Non-Goals

- Do not change approval rules, finance rules, receipts rules, tickets business rules, scheduling rules, or feedback deadline rules.
- Do not redesign the admin product from scratch.
- Do not change role permissions or menu visibility logic as part of this pass.

## Risks

- Low to medium: this is UI/interaction work across many high-frequency admin pages, so the main risk is accidental regression in navigation or queue continuity rather than business logic.
- Main watchpoint: same-path links that should preserve queue context must keep doing so, while same-page anchor links must actually scroll to the target section.

## Validation

- `npm run build`
- Local browser QA in a real admin session:
  - `/admin/approvals`
  - `/admin/todos`
  - `/admin/tickets`
  - `/admin/expense-claims`
  - `/admin/feedbacks`
  - `/admin/receipts-approvals`
- Confirm:
  - queue/result banners use the shared pattern
  - sticky work maps remain readable on narrow widths
  - no obvious horizontal overflow appears on the tested pages
  - clicking page work-map anchors actually moves to the target section inside the admin scroll container
  - anchor targets are not hidden under the sticky workbench bar
