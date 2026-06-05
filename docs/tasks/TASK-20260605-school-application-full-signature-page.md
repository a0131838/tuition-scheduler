# TASK 20260605 - School Application Full Signing Page

## Request

Parents opening a school application signing link should see the full agreement before signing, and signing should require a handwritten signature instead of only a confirmation click.

## Scope

- Show the full school application service agreement terms on the public signing page.
- Add a PDF preview link before signing.
- Reuse the existing handwritten signature pad from the student contract flow.
- Require `signatureDataUrl` on school application signing.
- Store the signature image and include it in the signed school application agreement PDF.

## Files Changed

- `app/school-application/[token]/page.tsx`
- `lib/school-application.ts`
- `lib/school-application-pdf.ts`

## Verification

- `npm run build`
- `npx tsc --noEmit --pretty false`
- Local smoke tested `signSchoolApplication` without `signatureDataUrl` and confirmed it rejects with `Handwritten signature is required`.

## Risk Notes

- Low to medium. This changes the public school application signing experience and signed PDF output only.
- It does not change student tuition contracts, package balances, attendance deductions, receipt approvals, payroll, scheduling, partner settlement, transport billing, or Business Accounts.
