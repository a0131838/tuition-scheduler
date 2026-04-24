# TASK-20260424 Student Contract Signature Visibility Fix

## Summary

Fix signed student contracts so the signature area is no longer blank when a contract was previously completed without a stored handwritten signature image, and prevent future contracts from being completed unless a handwritten signature image is actually submitted.

## Scope

- require handwritten signature data before `signStudentContract(...)` can complete
- show the signature block on the signed confirmation page
- regenerate signed contract PDF responses dynamically when older signed contracts have no stored signature image
- render a visible signer-name fallback in the PDF signature area for legacy signed contracts that do not have a stored signature image

## Files

- `lib/student-contract.ts`
- `lib/student-contract-pdf.ts`
- `app/contract/[token]/page.tsx`
- `app/api/exports/student-contract/[id]/route.ts`

## Risk

Low to medium. This changes the signature requirement for future sign attempts and the export behavior for legacy signed contracts without signature image files, but does not change invoice creation math, contract snapshot content, or package balance logic.

## Verification

- `npm run build`
- QA script confirmed missing-signature sign attempts now fail with `Handwritten signature is required`
- generated compatibility PDF for an existing signed contract with `signatureImagePath = null`
- rendered the compatibility PDF and verified the signature area is no longer blank
