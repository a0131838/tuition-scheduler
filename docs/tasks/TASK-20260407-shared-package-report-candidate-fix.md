# TASK-20260407 Shared Package Report Candidate Fix

## Goal

Ensure `Midterm Reports / 中期报告` and `Final Reports / 结课报告` treat each student on a shared `HOURS` package as an independent candidate, so operations can assign, exempt, and track reports for both the package owner and every shared student.

## Scope

- Fix candidate generation in:
  - `lib/midterm-report.ts`
  - `lib/final-report.ts`
- Generate report candidates per `package + student + teacher`, instead of collapsing to `package + teacher`
- Update admin assign/exempt actions in:
  - `app/admin/reports/midterm/page.tsx`
  - `app/admin/reports/final/page.tsx`
- Validate that the selected student actually belongs to the target package, including shared-student memberships
- Use the selected student when locating latest attendance, existing reports, assign targets, and exempt targets

## Non-Goals

- No schema changes
- No changes to report draft content or PDF/share behavior
- No changes to attendance deduction logic
- No changes to package balances, finance, payroll, or scheduling

## Output

- Shared-package students now appear as separate rows in both admin report centers when they qualify
- Assigning or exempting a report for one shared student does not suppress or overwrite the other student's candidate row
- Existing report lookups now use `packageId + studentId + teacherId`
- New reports created from shared-package candidates now attach to the correct student instead of always using the primary package owner

## Validation

- `npm run build`
- Open `/admin/reports/midterm` and verify shared-package students can appear separately
- Open `/admin/reports/final` and verify shared-package students can appear separately
- Confirm assigning or exempting one shared student does not remove the other student's candidate unless that second student also has a matching report state
