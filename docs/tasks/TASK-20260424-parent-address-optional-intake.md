# TASK-20260424 Parent Address Optional Intake

## Summary

Relax the parent-facing intake flows so address is optional instead of required, and keep contract snapshot generation working cleanly when no address is collected.

## Scope

- remove address from required validation in `/student-intake/[token]`
- remove address from required validation in `/contract-intake/[token]`
- allow parent-profile reuse and first-purchase package creation without address
- hide the contract address line when no address value exists

## Files

- `app/contract-intake/[token]/page.tsx`
- `app/student-intake/[token]/page.tsx`
- `lib/student-parent-intake.ts`
- `lib/student-contract.ts`
- `lib/student-contract-template.ts`

## Risk

Low. This only relaxes address validation and the corresponding contract rendering; it does not change signing, invoice creation, or partner-settlement behavior.

## Verification

- `npm run build`
- submit `/student-intake/[token]` without address
- submit `/contract-intake/[token]` without address
- verify generated contract snapshot omits the address row when address is blank
