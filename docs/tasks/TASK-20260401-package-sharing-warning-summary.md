# TASK-20260401-package-sharing-warning-summary

## Goal

Make package create/edit sharing safer by showing selected-count summaries and same-course duplicate warnings directly beside the sharing controls.

## Scope

- Show selected shared-student count and quick preview names in package create.
- Show selected shared-course count and quick preview names in package create.
- Show selected shared-student count and quick preview names in package edit.
- Show selected shared-course count and quick preview names in package edit.
- Warn when selected shared students already have an active package for the same course.

## Non-Goals

- No package creation API changes.
- No package update API changes.
- No top-up API changes.
- No settlement mode or ledger behavior changes.

## Files

- `app/admin/packages/PackageCreateFormClient.tsx`
- `app/admin/_components/PackageEditModal.tsx`
- `app/admin/packages/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`

## Status

- Completed locally and deployed to production.
