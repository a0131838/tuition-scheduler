# TASK-20260403-final-reports-phase-1-and-2

## 1) Request

- Request ID: `2026-04-03-final-reports-phase-1-and-2`
- Requested by: user after admin/academic feedback that the system has midterm reports but also needs a final report after course completion
- Date: `2026-04-03`
- Original requirement: add a separate `Final Report / 结课报告` workflow instead of reusing the midterm report flow, and make it usable for both teachers and operations.

## 2) Scope Control

- In scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403202000_add_final_reports/migration.sql`
  - `lib/final-report.ts`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/admin/reports/final/page.tsx`
  - `app/admin/layout.tsx`
  - release docs for this ship
- Out of scope:
  - final report PDF export
  - parent-facing final report delivery
  - automated bulk assignment
  - non-`HOURS` package support
  - changes to midterm reports
- Must keep unchanged:
  - attendance and deduction logic
  - package balance logic
  - payroll / finance behavior
  - existing midterm report workflow

## 3) Findings

- The current system only had `Midterm Reports / 中期报告`, which is not a clean fit for end-of-package summaries and next-step decisions.
- Reusing the midterm table/model would have mixed two different business meanings:
  - midpoint learning review
  - end-of-package final outcome summary
- The cleanest low-risk path is:
  - a separate `FinalReport` model
  - a teacher-side fill/submit flow
  - an admin-side candidate / assign / forwarded center

## 4) Plan

1. Add a dedicated `FinalReport` model and migration without changing existing `MidtermReport` behavior.
2. Add a teacher-side `Final Reports` list and detail page using the same high-level workbench pattern as midterm reports.
3. Add an admin-side `Final Report Center` that detects completed `HOURS` packages, allows manual assignment, and tracks `Assigned / Submitted / Forwarded`.

## 5) Changes Made

- Files changed:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403202000_add_final_reports/migration.sql`
  - `lib/final-report.ts`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/admin/reports/final/page.tsx`
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-phase-1-and-2.md`
- Logic changed:
  - added a new `FinalReport` data model with `ASSIGNED / SUBMITTED / FORWARDED` states
  - added teacher-side final report list and fill/submit page
  - added admin-side final report center with completed-package candidates, manual assign, and mark-forwarded actions
  - added separate teacher/admin navigation entries for `Final Reports / 结课报告`
- Logic explicitly not changed:
  - no midterm report logic
  - no attendance / package deduction / scheduling logic
  - no finance logic
  - no PDF export or parent delivery flow yet

## 6) Verification

- Build:
  - `npm run prisma:generate`
  - `npm run build`
- Runtime:
  - post-deploy startup check
  - production read-only QA on teacher and admin final-report pages
- Key manual checks:
  - `/teacher/final-reports` and `/teacher/final-reports/[id]` render successfully
  - `/admin/reports/final` renders candidate, assigned, submitted, and forwarded sections
  - teacher/admin navigation shows the new final-report entry

## 7) Risks / Follow-up

- Known risks:
  - this release introduces a new DB table and enum, so deployment requires the migration to apply cleanly on production
  - first version only supports `HOURS` packages and manual assignment
- Follow-up tasks:
  - add PDF export
  - add parent-facing delivery if needed later
  - refine candidate rules if academic wants “manual ready” flags instead of only completed packages
  - release docs were synced again in a final docs pass so all handoff files point at the deployed commit

## 8) Release Record

- Release ID: `2026-04-03-r20`
- Deploy time: completed on `2026-04-03` (Asia/Shanghai)
- Rollback command/point: previous production commit before `2026-04-03-r20`
