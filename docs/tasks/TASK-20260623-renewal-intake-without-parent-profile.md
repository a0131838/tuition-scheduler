# TASK 2026-06-23 Renewal Intake Without Parent Profile

## Problem

An existing student renewal contract can still require parent profile collection when the student has no previous reusable contract/intake profile. For `刘妍书`, the admin contract workspace correctly showed `Waiting for parent profile / 待家长填写资料`, but opening the parent info link displayed `No intake needed / 无需填写资料`.

## Root Cause

The public contract intake page blocked every `RENEWAL` flow before checking whether the contract was still in an intake-pending state and whether `parentInfo` was actually available. This was correct only for renewals with reusable parent details already on file.

## Fix

The renewal shortcut now applies only when parent profile collection is not needed. A renewal contract with status `INTAKE_PENDING` or `INFO_PENDING` and no saved `parentInfo` continues to render the parent profile form.

## Files Changed

- `app/contract-intake/[token]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260623-renewal-intake-without-parent-profile.md`

## Verification

- `npm run build`

## Risk

Low. The change is scoped to the public intake page guard. It does not change contract draft creation, formal signing, invoices, receipts, package balances, scheduling, attendance, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.
