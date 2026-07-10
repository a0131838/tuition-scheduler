# TASK-20260710-miniapp-staff-attendance

## Context

After the staff miniapp schedule and teacher feedback pages worked in WeChat Developer Tool, the next high-frequency teacher workflow is mobile attendance marking. This should let teachers handle class admin from the native miniapp without introducing schedule-edit or billing side effects.

## Change

- Added `GET /api/miniapp/staff/schedule/[sessionId]/attendance` to load visible students and current attendance rows for a teacher-owned session.
- Added `POST /api/miniapp/staff/schedule/[sessionId]/attendance` to upsert attendance status and note from the miniapp.
- Enforced server-side teacher scoping: the staff user must have a linked `teacherId`, and the target session must belong to that teacher.
- Preserved existing `deductedCount`, `deductedMinutes`, and `packageId` values when updating attendance rows.
- Added a mobile attendance section to the staff miniapp course detail page.

## Non-goals

- Did not add package deduction from the miniapp.
- Did not add schedule creation, cancellation, or rescheduling from the miniapp.
- Did not change teacher payroll, billing, receipts, partner settlement, transport billing, Business Accounts, or OpenClaw behavior.

## Verification

- Miniapp JavaScript syntax check passed.
- Miniapp JSON parse check passed.
- Staff WXML expression scan passed.
- `npx tsc --noEmit`
- `npm run build`

## Risk

Medium. This adds a new mobile write path to `Attendance`, but it mirrors the existing teacher portal permission model and does not touch deduction or finance workflows.
