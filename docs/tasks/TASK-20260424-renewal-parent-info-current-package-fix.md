# TASK-20260424 Renewal Parent Info Current Package Fix

## Goal

Make renewal contracts available from a package contract workspace after a signed first-purchase contract exists on that same package.

## Problem

The renewal CTA and renewal draft creation both only looked for reusable parent info from other packages. If a student only had a signed first-purchase contract on the current package, the system incorrectly hid the renewal button and would also reject renewal draft creation.

## Scope

- Allow reusable parent info lookup to include the current package.
- Ensure a signed first-purchase contract on the current package is enough to start a renewal contract.
- Do not change partner-package behavior, contract signing, or invoice creation logic.

## Files

- `lib/student-contract.ts`
- `app/admin/packages/[id]/contract/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- verify a package with a signed first-purchase contract on the same package now shows `Create renewal contract / 创建续费合同`
- verify clicking renewal no longer fails due to missing reusable parent info
