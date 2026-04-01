# TASK-20260401-package-edit-context-card

## Summary
- Add a stronger package context card to the edit and top-up modal so staff can always see which student's package they are working on.

## Scope
- `app/admin/_components/PackageEditModal.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Changes
- add a fixed top context card with student, course, source, status, remaining balance, and total balance
- keep that context visible while switching between `Edit package / 编辑课包` and `Top-up / 增购`

## Validation
- `npm run build`

## Status
- Completed and deployed.
