# TASK-20260425-student-academic-management-reminders

## Context

The business is moving from simple scheduling toward student-level academic management. Operators need one place to record a student's risk, parent concern, service tier, owner, and next action, and the Todo Center should surface students with active package balance but no upcoming lessons before they become retention risks.

## Scope

- Add student academic management fields for service plan, risk level, parent concern, advisor owner, and next action.
- Show the academic management profile on student detail.
- Let admins edit those fields from the existing student edit panel.
- Add Todo Center alerts for active-package students with no lesson in the next 14 days, due next actions, or high-risk status.
- Record the OpenClaw reminder plan as documentation only.

## Non-Goals

- Do not modify OpenClaw scripts, launchctl jobs, WeCom delivery, or gateway behavior.
- Do not auto-fill student risk data.
- Do not change scheduling creation rules, attendance, package deduction, payroll, or finance approval logic.

## Verification

- Queried production data: 77 students, 50 active-package students, 28 active-package students without a lesson in the next 14 days.
- Confirmed no student has filled the new academic management fields yet, so operators must populate them.
- Confirmed the parent-facing feedback template already has five required sections and missing-section validation.
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npm run build`

## Risk

Medium. This adds nullable database columns and a new read-only Todo Center query. Existing student records remain valid, but the new profile fields are empty until the team fills them in.

## Rollback

Revert the release commit. The database columns are additive and nullable, so leaving them in place during rollback is safe; dropping them is optional after confirming no data was entered.
