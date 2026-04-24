# TASK-20260424 Package Contract Renewal CTA After First Purchase

## Goal

Show a clear `Create renewal contract / 创建续费合同` action inside the package contract workspace after a first-purchase contract has already been signed, so ops can start the next renewal directly from the same page.

## Problem

The workspace only showed `Create renewal contract` in the empty-state branch where no contract existed yet. Once a package already had a signed first-purchase contract, ops only saw correction/replacement actions and could not start a normal renewal from that screen.

## Scope

- Keep the existing replacement-contract flow for correcting signed or invoiced contracts.
- Add a direct `Create renewal contract` action when the latest terminal contract is a first-purchase contract and reusable parent info already exists.
- Do not change partner-settlement behavior, signing logic, invoice generation, or package top-up rules.

## Files

- `app/admin/packages/[id]/contract/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- verify a package with a signed first-purchase contract now shows `Create renewal contract / 创建续费合同`
- verify the replacement-contract button still remains available for correction scenarios
