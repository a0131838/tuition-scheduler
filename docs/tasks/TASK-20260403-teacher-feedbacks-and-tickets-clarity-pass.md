# TASK-20260403-teacher-feedbacks-and-tickets-clarity-pass

## Goal

Reduce teacher-side reading friction on the student feedback desk and ticket board so teachers can tell why a page is empty, what to do next, and which action is primary without scanning dense tables first.

## Scope

- `app/teacher/student-feedbacks/page.tsx`
- `app/teacher/tickets/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Why

- Both pages already had a good workbench shell, but their empty states still felt abrupt and often stopped at “no data”.
- The filter bars still treated `Apply` like a plain button, so the main action was easy to miss.
- The teacher ticket board also needed a clearer “not linked yet” state and a stronger completion action hierarchy.

## Guardrails

- Do not change feedback timeline data, unread/read behavior, handoff-risk logic, ticket status transitions, proof-file lookup, or completion-note requirements.
- Keep routes, filters, and existing teacher actions intact.
- Limit changes to visual hierarchy, explanatory copy, and next-step navigation.

## Implementation Notes

1. Add stronger primary / secondary button styling for teacher-side filter and recovery actions.
2. Replace flat empty messages with cards that explain:
   - why the current page or queue is empty
   - whether the teacher should clear filters, go back to sessions, or return to dashboard
   - whether the page is blocked because no linked profile/student context exists yet
3. Make the ticket completion action feel like the clear primary action instead of another plain inline button.

## Verification

- `npm run build`
- Post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`

## Release

- Release ID: `2026-04-03-r09`
- Status: `LIVE`
