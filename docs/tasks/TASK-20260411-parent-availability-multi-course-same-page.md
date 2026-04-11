# TASK-20260411-parent-availability-multi-course-same-page

## Goal

Let one valid parent-availability link show multiple active courses for the same student on one page, while keeping each course on its own coordination ticket and submission payload.

## Scope

- keep the existing one-ticket-per-course storage model and database schema
- let `/availability/[token]` aggregate other active same-student coordination requests into separate course cards
- let each course card submit independently
- make student detail coordination tools course-aware instead of always following only the first open ticket
- make intake coordination reuse prefer a matching course lane instead of blindly reusing the first open coordination ticket

## Non-Goals

- no family-level bundle token or new aggregate table
- no cross-student household grouping
- no shared multi-course payload
- no teacher availability storage or scheduling engine rewrite
- no package, deduction, or finance logic change

## Risks

- one valid course token can now reveal other active same-student course lanes on the same page
- student detail helper actions must stay tied to the selected ticket or course lanes can get crossed
- intake reuse must stay backward-compatible when course labels are missing or only one open lane exists

## Validation

- `npm run build`
- verify one valid `/availability/[token]` page shows all active same-student course cards
- verify submitting one course card does not overwrite another course card's payload
- verify student detail can switch helper focus between open coordination tickets
- verify student detail only offers "create course ticket" for courses that do not already have an open coordination lane
- verify intake reuses only a matching course coordination ticket when one exists
