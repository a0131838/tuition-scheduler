# TASK-20260617-student-package-utilization

## Context

Finance needed to calculate how many hours Coco Xu had attended as of 2026-06-17 while separating her usage from Eason Xu, because both students share the same package.

Package ledger totals alone are not enough for this question because shared-package deductions belong to the same package. The safer source of truth for a per-student split is the attendance row: `Attendance.studentId`, `Attendance.packageId`, and `Attendance.deductedMinutes`.

## Change

- Added a read-only student package utilization report at `/admin/finance/student-package-utilization`.
- Added filters for student name, student ID, package ID, start date, and end date.
- Added summary metrics for lesson count and deducted hours.
- Added attendance detail rows showing session date, time, course, teacher, package owner, package ID, and deducted hours.
- Added available/shared package rows so finance can identify and copy the correct package ID.
- Added Excel export at `/api/exports/student-package-utilization`.
- Added finance/admin navigation entries, including a Finance Workbench shortcut.

## Non-goals

- Did not change attendance marking.
- Did not change package balance calculations.
- Did not create, edit, or delete `PackageTxn` ledger rows.
- Did not change invoices, receipts, approval rules, scheduling, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.

## Verification

- `npm run build`
- `npx tsc --noEmit`
- Local auth smoke check confirmed `/admin/finance/student-package-utilization` compiles and redirects unauthenticated users to `/admin/login`.
- Read-only data check for `Coco Xu` through `2026-06-17` returned 45 deducted attendance rows and 59.5 deducted hours on shared package `1df7bb95-8de1-4c10-bd7a-6a935af6af0e`.

## Risk

Low. The change is read-only and uses existing attendance deduction records for reporting. The main operational risk is finance choosing package ledger totals instead of the new per-student attendance-based report when siblings share a package.
