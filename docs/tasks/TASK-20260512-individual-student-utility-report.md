# TASK 20260512 Individual Student Utility Report

## 1) Request

- Request ID: `2026-05-12-individual-student-utility-report`
- Requested by: Cena
- Date: `2026-05-12`
- Original requirement: Add the report portion only for finance's request: weekly and monthly list of individual student utility report in Excel for Sales forecast. Admin and finance should both see the left-sidebar entry.

## 2) Scope Control

- In scope:
  - Read-only individual student utility report page.
  - Weekly and monthly filters.
  - Excel export with summary and detail sheets.
  - Admin and finance sidebar entries.
  - FINANCE route access.
- Out of scope:
  - 10-hour package-balance reminder.
  - Email reminders.
  - OpenClaw integration.
  - Any automatic follow-up workflow.
- Must keep unchanged:
  - Attendance marking and deduction logic.
  - Package balances and package transactions.
  - Scheduling.
  - Invoices, receipts, approvals, payroll, tutor-cost exports, and existing monthly-hours reports.

## 3) Findings (Read-only Phase)

- Root cause: Finance needs a dedicated Sales forecast utility export; the existing monthly-hours export is attendance-update-date based, while this report should use lesson/session date.
- Affected modules:
  - `Attendance`
  - `Session`
  - `Student`
  - `StudentType`
  - `CoursePackage`
  - Admin layout navigation.
- Impact level: Low. Read-only query and export only.

## 4) Plan (Before Edit)

1. Add an isolated report helper using individual student type semantics and lesson/session date range filtering.
2. Add a finance report page with weekly/monthly controls and preview metrics.
3. Add an Excel export route with `Student Summary` and `Utility Detail` sheets.
4. Add admin and finance sidebar entries plus FINANCE route access.

## 5) Changes Made

- Files changed:
  - `lib/individual-student-utility-report.ts`
  - `app/admin/finance/individual-student-utility/page.tsx`
  - `app/api/exports/individual-student-utility/route.ts`
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260512-individual-student-utility-report.md`
- Logic changed:
  - Added a read-only report for individual students where student type contains `自己学生`, `直客学生`, `own`, or `self`.
  - Filters by `Session.startAt` within the selected period.
  - Includes only `PRESENT` or `LATE` attendance rows with `deductedMinutes > 0`.
  - Exports Excel workbook with student summary and utility detail.
- Logic explicitly not changed:
  - No reminder logic.
  - No email or OpenClaw integration.
  - No package, attendance, scheduling, invoice, receipt, payroll, or approval writes.

## 6) Verification

- Build:
  - `npx tsc --noEmit`
  - `npm run build`
- Runtime:
  - Real-data helper check for `2026-04` returned 20 students, 227 lessons, and 399.25 deducted hours.
  - Local authenticated HTTP page check returned `200`.
  - Local authenticated Excel export returned `200`.
- Key manual checks:
  - Exported workbook opened successfully.
  - Workbook sheets: `Student Summary`, `Utility Detail`.
  - Summary/detail headers matched the requested report fields.
  - Temporary auth session used for local HTTP testing was deleted after verification.

## 7) Risks / Follow-up

- Known risks:
  - Finance should confirm that "individual students" should continue to mean student type names containing `自己学生` / `直客学生` / own / self.
  - Finance should confirm that Sales forecast utility should be based on lesson/session date, not attendance update date.
- Follow-up tasks:
  - Add 10-hour low-balance reminder later after finance confirms the report口径.

## 8) Release Record

- Release ID: `2026-05-12-r141`
- Deploy time: pending deploy
- Rollback command/point: revert release commit `2026-05-12-r141`.
