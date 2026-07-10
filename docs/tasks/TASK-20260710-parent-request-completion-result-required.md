# TASK-20260710-parent-request-completion-result-required

## Objective

Require staff/admin to write a parent-visible completion result before closing a parent request.

## Scope

- Added `completionResult` to the parent-request DTO, currently backed by the existing Ticket `finalSchedule` field.
- Staff miniapp request detail now includes a textarea for the parent-visible completion result.
- Staff miniapp blocks `Completed` status updates until the completion result is filled.
- Admin mobile parent-request page prompts for the completion result before marking a request completed.
- Staff miniapp and admin ops APIs reject `Completed` updates without a completion result.
- Parent miniapp request detail displays the completion result after one exists.

## Business Rules

- A request cannot be closed with only internal notes.
- The completion result is parent-visible and should be written as a concise external-facing answer.
- Internal original notes, WeChat screenshots, and internal handling details remain hidden from parent views.
- This release avoids a database migration by using `Ticket.finalSchedule` as a temporary storage field.

## Future Follow-Up

- Add formal database fields such as `publicResult` or `completionResult`.
- Add reusable completion templates for common request types.
- Queue subscription-message notifications when a request is completed.

## Verification

- `npx tsc --noEmit` passed.
- Miniapp JS syntax and JSON parse checks passed.
- Parent/staff request-detail WXML complex-expression scan passed.
- `npm run build` passed.
