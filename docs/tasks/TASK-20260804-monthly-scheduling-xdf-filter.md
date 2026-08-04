# TASK: Separate New Oriental monthly scheduling work

- Release: `2026-08-04-r311`
- Owner surface: Academic Web and Staff Mini Program
- Status: Ready for deployment

## Request

Keep New Oriental students in a separate next-month scheduling queue while grouping every other student together.

## Implementation

- Reuse the system source-channel value `新东方学生` as the only `XDF` classifier.
- Default the operational view to `博思及其他` and expose a one-click `新东方学生` switch.
- Scope queue counts, item rows, family-message preparation, staffing forecasts and CSV exports to the selected group.
- Include the student's source on visible work items and exports.
- Keep item-detail links source-safe so an XDF item remains directly accessible.

## Safety boundary

- No schema or migration.
- No student source data is rewritten.
- Parent Mini Program remains unchanged because parents only see their linked students.
- Existing family grouping, proxy entry, offer ranking, temporary holds and formal scheduling validation remain unchanged.
- Finance, packages, balances, attendance, deductions, contracts, receipts, payroll, tickets and historical lessons are untouched.

## Verification

- Unit test for exact-source grouping.
- Static safety coverage for Web, Staff API, Staff Mini Program and export.
- TypeScript, repository tests, Mini Program checks, production build and guarded deployment.
