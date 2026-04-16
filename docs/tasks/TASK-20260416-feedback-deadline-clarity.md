# TASK-20260416-feedback-deadline-clarity

## Goal

Make the teacher after-class feedback late rule easier to understand without changing the actual business rule.

## Why

- Teachers reported confusion that feedback looked late right after class.
- The 12-hour late cutoff was duplicated in several places, which made future drift more likely.
- The teacher UI did not clearly tell users exactly when late starts.

## Scope

- Add one shared helper for feedback due time, overdue cutoff, overdue minutes, and submit status.
- Update the teacher feedback submit API to return the computed deadline text together with the submit result.
- Update the teacher session detail and feedback form success state to explain:
  - the exact late-start time
  - whether the current submit is still on time or already late
- Rewire teacher session list, admin alerts, admin feedback overdue queue, admin proxy draft, and admin manual-overdue handling to use the same shared helper.
- Add regression tests for the feedback timing helper.

## Non-Goals

- Do not change the 12-hour deadline rule.
- Do not change attendance logic.
- Do not change payroll, receipts, invoices, packages, approvals, or scheduling business logic.

## Risks

- Low: this is a timing-helper consolidation plus clearer UI copy.
- Main watchpoint: make sure no page accidentally shifts from the existing 12-hour cutoff.

## Validation

- `npx tsx --test tests/feedback-timing.test.ts`
- `npx tsx --test tests/billing-optimistic-lock.test.ts`
- `npm run build`
- Manual check:
  - open a teacher session detail page
  - confirm the page shows the exact late-start time
  - submit feedback and confirm the success message shows whether it is on time or late
