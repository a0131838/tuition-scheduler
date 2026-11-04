# TASK-20261104-report-candidate-stages

## Context

Jessika could not see near-complete students in her report lists. Final candidates previously required a zero balance, teacher lists required an explicit assignment, and midterm candidates disappeared above 70%. Package top-ups also made an assignment-time progress snapshot appear inconsistent with current usage.

## Change

- Add an admin near-completion watchlist at <=8 hours or <=10% remaining, separate from completed packages. Admin must explicitly choose a teacher to assign an early draft, including when the responsible teacher differs from recorded attendance.
- Keep the final report in draft until the package has a known zero balance; enforce submission eligibility in both teacher web and mini-program endpoints. Existing delivery and parent-PDF status gates remain.
- Keep midterm candidates visible beyond 70%, labelled overdue. Show assignment-time subject progress and current whole-package usage separately in admin and teacher views.

## Non-goals

No package ledger, attendance, renewal, scheduling, finance or historical report data changes. No automatic assignment to Jessika or any other teacher.

## Verification

- `npx tsx --test tests/report-package-progress.test.ts tests/midterm-report-candidate-progress.test.ts tests/learning-report-delivery.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- Read-only production data check and guarded deployment verification recorded in release output.

## Risk

Medium: a manually assigned early draft needs the admin to choose the actual responsible teacher. Older reports with package top-ups retain historical snapshots; users must read the new labels. Rollback the application commit without modifying report records.
