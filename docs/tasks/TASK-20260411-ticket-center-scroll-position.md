# TASK-20260411-ticket-center-scroll-position

## Goal

Keep ticket-center operators in context after server actions so the page does not bounce back to the top after every save, archive, delete, or coordination action.

## Scope

- preserve list-page row context after status changes in `/admin/tickets`
- preserve list-section context after archive/delete actions in `/admin/tickets` and `/admin/tickets/archived`
- preserve section context after status, edit, and scheduling-coordination actions in `/admin/tickets/[id]`
- preserve existing filters and permissions

## Non-Goals

- no ticket workflow rule changes
- no permission changes
- no delete/archive eligibility changes
- no intake, scheduling, session, package, deduction, or finance logic changes

## Risks

- hash anchors can be lost if redirect helper functions strip URL fragments
- delete actions need to return to a surviving list anchor rather than a removed row anchor
- archived list actions must preserve existing filters while restoring scroll position

## Validation

- `npm run build`
- verify list status actions keep operators on the same ticket row
- verify closed-ticket archive/delete actions return to the ticket list area
- verify ticket detail actions return to the same section anchor
