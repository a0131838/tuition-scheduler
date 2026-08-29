# TASK-20260829 Ticket feedback reconciliation

## Objective

Apply the August 24–27 teaching-operations feedback consistently across the formal Ticket Center, staff Mini Program and AI OS handoff without weakening the existing execution gates.

## Formal system changes

- Convert raw fetch/timeout failures into an employee-safe retry message; incomplete AI responses are never saved as a ready plan.
- Show the complete AI operation list so batch cancellations and reschedules cannot hide affected lessons after item 12.
- Keep one visible state-specific primary action. AI unavailable/manual processing and externally completed work remain available under a disclosed recovery section.
- In the staff Mini Program, formally resolved actions become “verify result and close”; no duplicate AI preparation is attempted.

## Employee impact

- Staff first complete the one primary action shown for the current state.
- If AI is unavailable or actual work was already completed elsewhere, staff expand the recovery section and retain the existing audited manual-resolution path.
- Batch work shows every affected lesson before confirmation.
- Network failures explain what to do next and confirm that incomplete results were not saved.

## Safety and rollback

- No database migration and no permission expansion.
- Existing formal execution, transaction, current-version and idempotency gates remain unchanged.
- Manual processing and audited existing-result recovery remain available.
- Roll back the release commit if Ticket Center rendering, AI preparation or Mini Program AI work regresses.

## Verification

- Focused AI-plan and ticket-action tests.
- TypeScript and production build.
- Mini Program audit and source-level resolved-action regression.
- Guarded release check plus post-deploy Ticket Center, AI SSO and health verification.

