# TASK-20260723-shared-package-student-course-scope

## 1) Request

- Request ID: `shared-package-student-course-scope`
- Requested by: Management
- Date: `2026-07-23`
- Original requirement: shared-package students may be in different grades and study different content, so changing one student's course must not change the other shared students.

## 2) Scope Control

- In scope:
  - Require a selected student when changing course on a shared package.
  - Allow the operator to select which package-eligible source course is being replaced.
  - Move only that student's safe future one-to-one sessions.
  - Keep the package primary course unchanged and add the target course to the shared deduction scope.
- Out of scope:
  - Per-student balance allocation inside the shared pool.
  - Automatic group-session splitting.
  - Historical course rewrites.
- Must keep unchanged:
  - Other shared students and their lessons.
  - Completed/protected lessons, attendance and deductions.
  - Package balance, contracts, invoices, receipts, payroll and partner settlement.

## 3) Findings

- Root cause: the first course-transition release correctly scoped package ownership but treated every owner/shared student as eligible for migration.
- Affected modules: package edit UI, package update/preview API and package-course transition service.
- Impact level: Medium and operator-triggered.

## 4) Changes Made

- Shared-package editing now requires:
  - `Student to change / 要修改的学生`
  - `Current course to replace / 要替换的原课程`
  - `New course / 新课程`
  - a change reason
- The service validates both the selected student and source course against the package.
- Session discovery, preview and migration use one selected student only.
- A capacity-one session linked to more than one student is treated as ambiguous and remains unchanged.
- Shared packages remain one balance pool; the primary course is preserved and source/target courses remain available for deduction.

## 5) Verification

- TypeScript passed.
- 6 focused package-course transition tests passed.
- 109 backend regression tests passed.
- The 213-route production build passed.
- `git diff --check` passed.

## 6) Risk / Follow-up

- Shared group sessions still require individual handling because changing their shared Class would alter every enrolled student's schedule.
- Operators must review the preview exception counts before saving.

## 7) Release Record

- Release ID: `2026-07-23-r282`
- Deployment status: ready
- Rollback point: `8fa1c15a35e4fb52c581b974eb79ffcdef5802cc`
