# TASK-20260710-miniapp-staff-feedback

## Context

After the staff miniapp daily schedule shipped, the next high-frequency employee workflow is teacher feedback. Teachers should be able to open a course from the native miniapp and submit the same parent-facing after-class feedback required by the existing teacher portal.

## Change

- Added `GET /api/miniapp/staff/schedule/[sessionId]/feedback` to load course context and any existing teacher feedback.
- Added `POST /api/miniapp/staff/schedule/[sessionId]/feedback` to create or update `SessionFeedback` from the miniapp.
- Reused the existing five-section parent-facing feedback format and required-section validation.
- Enforced server-side teacher scoping: the staff user must have a linked `teacherId`, and the target session must belong to that teacher.
- Added a miniapp course detail page with feedback fields for lesson focus, current finding, class performance, next plan, parent note, homework, and previous-homework completion.
- Made staff schedule cards open the course detail page.

## Non-goals

- Did not add attendance marking from the miniapp.
- Did not add schedule creation or rescheduling writes.
- Did not change the admin feedback forwarding workflow.
- Did not change package balance, attendance deduction, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, or OpenClaw behavior.

## Verification

- Miniapp JS syntax and JSON parse checks.
- `npx tsc --noEmit`
- Staff feedback route included in the Next production build.
- Post-deploy unauthorized route smoke check returns `401`.
- `npm run build`

## Risk

Medium. This adds a new mobile write path to `SessionFeedback`, but the field format and validation match the existing teacher portal, and the route enforces teacher/session ownership before writing.
