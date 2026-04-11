# TASK-20260411-ticket-complete-note-prompt

## Goal

Bring back a clear completion-note prompt before marking a ticket completed, without relying on a top-of-page error after submit.

## Scope

- prompt for the required completion note before submitting `Completed` from `/admin/tickets`
- prompt for the required completion note before submitting `Completed` from `/admin/tickets/[id]`
- keep the anchored return behavior from the previous ticket-center scroll fix
- keep server-side completion-note validation as a fallback guard

## Non-Goals

- no ticket status rule changes
- no permission changes
- no archive/delete behavior changes
- no scheduling, intake, session, package, deduction, or finance logic changes

## Risks

- prompt flow must not block non-Completed status updates
- prompt cancellation should stop submission cleanly without partial form state issues
- browser prompt text needs to stay clear in both Chinese and English

## Validation

- `npm run build`
- verify list status action prompts for a completion note before `Completed`
- verify detail status action prompts for a completion note before `Completed`
- verify cancel or empty prompt does not submit and does not move the page away from the current anchored section
