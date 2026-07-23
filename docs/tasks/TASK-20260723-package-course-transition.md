# TASK-20260723-package-course-transition

## 1) Request

- Request ID: `package-course-transition`
- Requested by: Management / Academic Operations
- Date: `2026-07-23`
- Original requirement: allow Academic Operations to change an existing package from an admission-exam course to an academic-subject course, and update already arranged but not-started lessons so parent reminders and schedules show the intended course. Completed lessons must retain their original course.

## 2) Scope Control

- In scope:
  - Add a controlled primary-course selector to package editing.
  - Preview the affected future lesson counts before saving.
  - Move safe future one-to-one sessions to an equivalent class under the selected course.
  - Rebuild pending 24-hour miniapp reminders from the updated session.
  - Standardize normal package suggestions at 15, 50 and 100 hours.
- Out of scope:
  - Global course-name rewrites.
  - Automatic changes to shared group sessions.
  - Rewriting already-sent WeChat messages.
  - Historical data migration.
- Must keep unchanged:
  - Completed lessons, attendance and deductions.
  - Existing package balances and transaction history.
  - Contracts, invoices, receipts, payroll and partner settlement.
  - Existing shared-student ownership and permissions.

## 3) Findings (Read-only Phase)

- Root cause: parent schedules and reminders read the course from `Session.class.course`, while changing only `CoursePackage.courseId` does not alter already arranged sessions.
- Affected modules: package edit, package creation presets, future one-to-one session class assignment and pending miniapp reminder outbox.
- Impact level: Medium. The write is user-triggered, transactional and limited to future safe one-to-one sessions.

## 4) Plan (Before Edit)

1. Add a package-course transition preview and require a reason.
2. Move eligible future one-to-one sessions and update the package in one transaction.
3. Preserve the old course as a shared compatibility course for historical deduction.
4. Invalidate only pending reminders so the normal queue rebuilds current content.
5. Add regression tests, build, commit and deploy through the guarded release process.

## 5) Changes Made

- Files changed:
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `app/api/admin/packages/[id]/route.ts`
  - `lib/package-course-transition.ts`
  - `lib/package-hour-presets.ts`
  - `lib/miniapp-notifications.ts`
  - `tests/package-course-transition.test.ts`
- Logic changed:
  - Package edit now previews and applies a course transition with an audit reason.
  - Only future capacity-one sessions with one identifiable package student, no feedback and no attendance/deduction activity move to the new course.
  - Bilingual subject and level names are matched where unambiguous; unmatched optional subject/level values are cleared on the new class.
  - Pending course reminders for moved sessions are invalidated and may be queued again with fresh content.
  - Normal package creation and top-up presets use 15, 50 and 100 hours.
- Logic explicitly not changed:
  - Completed/protected sessions and group sessions remain unchanged.
  - No package minutes, payment records or financial documents are rewritten.

## 6) Verification

- Build: TypeScript and the 213-route production build passed.
- Runtime: feature commit `a654dd1d4cbe89677d59b1d047a917af7cbca0a6` aligned locally, on GitHub and on the production server; PM2 PID `4053092` is online and `/admin/login` returns HTTP 200.
- Key manual checks:
  - 108 backend regression tests passed.
  - 5 focused package-course transition tests passed.
  - `git diff --check` passed.

## 7) Risks / Follow-up

- Known risks: group lessons share one Session/Class record across students, so they are intentionally shown as exceptions instead of being changed for every student.
- Follow-up tasks: Academic Operations should review the preview counts before saving and handle any listed group/protected/ambiguous session individually.

## 8) Release Record

- Release ID: `2026-07-23-r281`
- Deploy time: `2026-07-23` (Asia/Singapore)
- Rollback command/point: `662fa7c1ce00599a32e34556ffb1e9c8dbc1fec2`
