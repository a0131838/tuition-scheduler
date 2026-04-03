# TASK-20260403 Teacher Payroll Density Trim

## Goal

Reduce repeated copy on the teacher payroll page so the first screen feels more like one clear workbench instead of repeating the same payroll status in multiple boxes.

## Scope

- `app/teacher/payroll/page.tsx`
- release documentation updates for the same ship

## Changes

1. First-screen summary trim
- remove the extra `Current stage` stat card
- keep the first screen focused on:
  - total salary
  - sessions in cycle
  - total hours
  - cycle window

2. Workflow card simplification
- replace the repeated `Current payroll status` block with a single `What happens next` work card
- keep one compact stage pill instead of repeating the same stage as a large heading and a second paragraph block
- preserve the current owner, action prompt, finance note, timeline, and confirm button logic

3. Calculation disclosure cleanup
- remove the repeated top-of-disclosure recap for current period, sessions, total hours, and total salary
- replace it with a lighter helper note that tells teachers when they actually need to open the calculation details

## Non-goals

- no payroll calculation changes
- no payroll confirmation-rule changes
- no approval-stage changes
- no finance payout or audit-log changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3325/teacher/payroll` confirmed the page still loads correctly for the current empty-state teacher account
- current local and production teacher account state is `Admin has not sent this month's payroll yet`, so this validation could confirm the surrounding page shell and empty state, but not a sent-payroll first screen

## Release notes

- Release ID: `2026-04-03-r01`
- Risk: low
- Rollback: revert this release if the new payroll summary layout makes the current owner / next-step message harder to understand, if the confirm button becomes visually disconnected from the workflow card, or if teachers can no longer tell where to open detailed payroll calculations
