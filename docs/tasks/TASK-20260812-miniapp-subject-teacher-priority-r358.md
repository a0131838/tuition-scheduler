# TASK-20260812-miniapp-subject-teacher-priority-r358

## Context

The SGT AI OS web scheduler supported an independent primary, first backup and second backup teacher order for each subject in a provisional multi-subject new-student request, but the staff miniapp did not expose the same decision.

## Change

- Added a signed staff bridge action to retrieve the AI subject teacher plan.
- Added one per-subject teacher-order block inside the existing AI Today Work detail.
- Passes the confirmed teacher order back into the existing one-confirmation AI preparation request.
- Keeps the full course-change comparison calendar and return-to-queue behavior from r357 in the same upload.

## Non-goals

- No new miniapp navigation entry or page.
- No direct AI write to the formal database.
- No changes to finance, attendance deduction, package balance, payroll or real notifications.

## Verification

- JavaScript syntax, miniapp release audit, focused tests, TypeScript and production build.
- Guarded server release and protected production smoke checks.
- WeChat development-version upload followed by a separate experience-version/physical-phone gate.

## Risk

Medium-low. This adds one operator decision surface and a signed read/advisory bridge. Formal schedule execution remains behind the existing server validation and one-confirmation gate.
