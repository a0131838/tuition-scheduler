# TASK-20260728-training-manager-overview

## Context

The manager sign-off page queried only `StaffTrainingProgress`. Production had 56 staff accounts but zero current training-progress rows, so the page showed only its heading and navigation even though every employee already had assigned role-based modules.

## Change

- Query all non-student users with active training-role assignments and current-version progress.
- Derive each employee's required modules from the primary role plus additional training roles.
- Show overview metrics for staff, required modules, pending sign-off, completed modules, and staff not started.
- Show every employee before training begins, with language, roles, completion percentage, and counts for not started, in progress, pending sign-off, and complete.
- Expand an employee to see every assigned module and its reading, quiz, practical, reviewer, and review-note state.
- Keep approve/rework controls only on modules whose reading, passing quiz, and practical submission make them ready for manager review.
- Add a deterministic status helper and tests.

## Non-goals

- Do not create `StaffTrainingProgress` rows when the page loads.
- Do not automatically mark any reading, quiz, practical, or module complete.
- Do not change training roles, primary roles, workspace access, or operational permissions.
- Do not change scheduling, attendance, packages, contracts, finance, payroll, settlement, Full Care, or parent-visible data.

## Verification

- Production read-only check: 56 non-student staff and 0 training-progress rows before the change.
- Local authenticated render showed 56 employee cards and 378 assigned modules even with no progress rows.
- Temporary visual-verification session was deleted; remaining rows: 0.
- Status helper covers not started, in progress, needs rework, pending sign-off, and completed cases.
- All 118 backend tests passed.
- TypeScript passed.
- The complete 228-page production build passed.

## Risk

Low. The page performs a larger read and renders more collapsed employee summaries, but it does not write data. Existing approval/rework server actions are unchanged and remain available only after the same readiness conditions.

## Production verification

- Runtime feature commit `29d2d5f13e0dc4bfe22579faf3df459822b663c6` deployed with PM2 PID `1953887`.
- `/admin/login` returned HTTP 200 after deployment.
- An authenticated production request to `/training/manage` returned HTTP 200.
- The production page rendered 56 employee detail cards and included the overview heading, staff-not-started metric, and manager account record.
- The short-lived production verification sessions were deleted; remaining matching sessions: 0.
