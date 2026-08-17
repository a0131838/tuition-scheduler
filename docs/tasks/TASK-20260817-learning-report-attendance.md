# TASK-20260817-learning-report-attendance

## Context

Final Report mixed two package-level values: the package capacity saved when a report was assigned and the package's current capacity when the PDF was generated. Midterm Report also stored package-wide consumption. These values were incorrect for individual subject learning, especially when siblings shared one package or a package was topped up after report assignment.

## Change

- Added one attendance snapshot calculation shared by Final and Midterm Reports.
- Counted only `PRESENT` and `LATE` attendance rows for the report student and package.
- Scoped hours to the report subject, with teacher scope only as a fallback for reports without a subject.
- Excluded sessions ending after the report's first submission timestamp.
- Stored an immutable snapshot when teachers submit from Web or the Staff Mini Program.
- Recalculated legacy submitted reports read-only through their existing submission timestamp.
- Updated Final PDF, Midterm PDF, teacher report details and the parent Final Report share page.
- Stopped assigning package-wide hour/session labels to new reports.

## Non-goals

- No attendance status, package deduction, package balance or ledger record changed.
- No midterm candidate threshold or final-report assignment workflow changed.
- No scheduling, payroll, finance, invoice, receipt or settlement behavior changed.

## Verification

- `npx tsx --test tests/learning-report-attendance.test.ts tests/miniapp-teacher-workbench.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- Production read-only attendance reconciliation by student and subject.

## Risk

Low to medium and limited to learning-report display and report submission metadata. Legacy reports without a stored snapshot perform one indexed attendance query when opened; no production row is modified by that fallback.
