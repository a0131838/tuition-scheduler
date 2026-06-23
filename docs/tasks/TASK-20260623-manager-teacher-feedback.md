# TASK-20260623 Manager Teacher Feedback

## Request

Management has started classroom quality management and gives teachers lesson feedback. Teachers asked to see management comments directly in the system.

## Scope

- Add an isolated `ManagerTeacherFeedback` table for private manager-to-teacher comments.
- Add a Manager Quality Desk form to send feedback to one teacher, optionally tied to a same-day session.
- Show recent manager feedback and acknowledgement state on the manager side.
- Add a teacher portal navigation item, dashboard task card, and `/teacher/manager-feedback` page.
- Allow teachers to acknowledge feedback assigned to their own linked teacher profile.

## Out of Scope

- No teacher reply workflow in phase 1.
- No parent-facing sharing.
- No changes to scheduling, attendance deduction, package ledgers, billing, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.

## Verification

- `npx prisma generate`
- `npm run build`

## Rollback

Revert the release commit and drop the `ManagerTeacherFeedback` table if the migration has already been applied and no feedback data needs to be preserved.
