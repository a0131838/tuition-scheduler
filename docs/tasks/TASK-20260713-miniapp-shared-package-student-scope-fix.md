# TASK-20260713 Miniapp Shared Package Student Scope Fix

## Goal

Keep a shared package available to every linked student without mixing their one-to-one lessons, feedback, or reminders.

## Root Cause

- The staff scheduling candidate query checked only packages owned by the student and ignored packages linked through `CoursePackageSharedStudent`.
- Several miniapp read paths treated every class enrollment as a session participant, even when a capacity-one session explicitly named a different student.
- In the real Daisy/Louis data, the package is intentionally shared, while Daisy's future sessions explicitly belong to Daisy and some underlying class enrollment rows still include both siblings.

## Completed

- Included active shared packages in the all-student scheduling center and deduplicated owned/shared results.
- Added clear package labels for the package owner and linked shared students.
- Centralized session ownership rules for one-to-one and group lessons.
- Applied the same ownership scope to parent home, schedule, feedback list/detail, staff scheduling coordination, first-scheduling status, feedback notifications, and course-reminder coverage.
- Added regression tests for shared-package readiness and capacity-one sibling isolation.

## Safety Boundaries

- No database migration or production data rewrite.
- Package balances, ledger deductions, finance gates, attendance, payroll, and invoices are unchanged.
- Sharing a package does not automatically share owner-scoped financial documents with another student's family.
- Capacity-one session ownership prefers the explicit session student, then the one-to-one class student, and only then a single enrollment fallback. Group sessions continue to use class enrollments.

## Verification

- [x] TypeScript.
- [x] 22 focused scheduling, conflict, feedback-notification, and subscription tests.
- [x] 26-page native-miniapp release audit with zero errors.
- [x] Full 192-page production build.
- [x] Read-only real-data check: Daisy is ready, has no prerequisite blocker, sees the shared package owner label, and has 24 future sessions with zero foreign explicit students.
- [x] Read-only real-data check: Louis is ready for renewal, sees the linked shared-student label, and has zero future sessions instead of inheriting Daisy's 24 lessons.
- [ ] Production API smoke check after deployment.
