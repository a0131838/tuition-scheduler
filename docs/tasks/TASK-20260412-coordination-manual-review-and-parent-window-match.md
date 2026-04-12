# TASK-20260412-coordination-manual-review-and-parent-window-match

## Goal

Make scheduling coordination reflect parent re-submissions after confirmation as a manual-review state, and make helper candidate generation search inside the parent-submitted availability window before filtering.

## Scope

- add a manual-review phase when a confirmed coordination ticket receives a new parent availability submission
- keep phase labels consistent across student detail, ticket detail, and todo views
- prefer a coordination ticket's `durationMin` when deciding suggested helper duration
- add a helper path that scans a larger teacher-availability pool inside the parent-submitted availability window, then filters those slots against the parent payload
- use that parent-window matching path for public parent submission updates, student detail helper previews, and ticket detail helper previews

## Non-Goals

- no database schema change
- no parent form payload format change
- no quick schedule rewrite
- no teacher availability storage rewrite
- no package, deduction, or finance logic change

## Risks

- helper slot generation may now return a different but more parent-aligned shortlist than before
- manual-review detection currently depends on the coordination summary text marker for post-confirmation re-submissions
- ticket pages and todo cards must stay in sync so ops does not see conflicting phase labels

## Validation

- `npm run build`
- verify a confirmed coordination ticket that receives a new parent submission now shows `Manual review needed / 需人工复核`
- verify student detail, ticket detail, and todo cards all show the same phase for that ticket
- verify helper candidate generation looks inside the parent-submitted availability window first and returns parent-matching slots when they exist
- verify suggested duration prefers `ticket.durationMin` when it is present
