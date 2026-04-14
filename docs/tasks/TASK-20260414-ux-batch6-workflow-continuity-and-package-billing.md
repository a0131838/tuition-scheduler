# TASK-20260414-ux-batch6-workflow-continuity-and-package-billing

## Goal

Improve workflow continuity across the highest-frequency admin pages and make Package Billing easier to use as a mature internal workbench without changing any business rules.

## Scope

- carry a visible return path from `Students` into `Student Detail` and `Scheduling Coordination`
- carry a visible return path from `Receipt Queue` into `Package Billing`
- keep those workflow parameters when users continue deeper into the linked work areas
- make `Package Billing` show summary context first and move invoice creation behind an expandable section
- make package receipt-progress and approval wording more action-first

## Non-Goals

- no billing logic changes
- no receipt approval rule changes
- no student or coordination business-rule changes
- no schema changes

## Files

- `app/admin/students/AdminStudentsClient.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `app/admin/packages/[id]/billing/page.tsx`
- `docs/UX-REVIEW-20260414.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- opening a student from the current list should provide a return path back to the same list in student detail and coordination
- opening package billing from receipt approvals should provide a return path back to the same receipt queue
- package billing should show summary context before invoice creation
- package billing receipt states should read more action-first
