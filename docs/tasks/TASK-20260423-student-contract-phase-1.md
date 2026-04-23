# TASK-20260423 Student Contract Phase 1

## Goal

Add a first-pass direct-billing student contract workflow that lets ops create a contract draft from package billing, send a parent intake link, collect parent details, generate a formal contract snapshot, and complete signing with a final signed PDF.

## Scope

- Add Prisma models for:
  - `ContractTemplate`
  - `StudentContract`
  - `StudentContractEvent`
- Add a default bilingual tuition-agreement template and snapshot builder.
- Add contract PDF generation for:
  - unsigned preview
  - signed final PDF
- Add admin-side entry points in:
  - package billing
  - student detail
- Add parent public pages for:
  - intake form
  - formal signing page
- Add student-contract export route.

## Non-goals

- No partner-settlement contract workflow yet.
- No multi-signer workflow yet.
- No OTP or third-party e-sign integration yet.
- No hard scheduling gate tied to contract signing yet.

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/20260423113000_add_student_contracts_phase1/migration.sql`
- `lib/business-file-storage.ts`
- `lib/student-contract-template.ts`
- `lib/student-contract-pdf.ts`
- `lib/student-contract.ts`
- `app/contract/_components/ContractSignaturePad.tsx`
- `app/contract-intake/[token]/page.tsx`
- `app/contract/[token]/page.tsx`
- `app/api/exports/student-contract/[id]/route.ts`
- `app/admin/packages/[id]/billing/page.tsx`
- `app/admin/students/[id]/page.tsx`

## Risks

- The new contract flow writes files under `/uploads/contracts/*` and `/uploads/contract-signatures/*`, so storage permissions and upload serving must stay aligned in production.
- Parent public pages now depend on token validity and snapshot generation; malformed token or expired-token handling must remain read-only and safe.
- Handwritten signature data may be unavailable on some browsers or automation environments, so the signed-contract flow now falls back to typed-name acceptance instead of blocking the whole signing step.

## Verification

- `npx prisma generate`
- `npx prisma migrate deploy`
- `npm run build`
- Library-level contract-flow QA:
  - create draft
  - submit intake
  - sign contract
  - verify signed PDF path is stored and file exists
- Browser QA against a fresh local server:
  - create draft from package billing
  - submit parent intake form
  - complete sign flow
  - download signed PDF
- QA evidence captured in:
  - `tmp/qa-student-contract-flow-real-sign/01-billing-before-create.png`
  - `tmp/qa-student-contract-flow-real-sign/02-billing-after-create.png`
  - `tmp/qa-student-contract-flow-real-sign/03-intake-filled.png`
  - `tmp/qa-student-contract-flow-real-sign/04-sign-page.png`
  - `tmp/qa-student-contract-flow-real-sign/05-signed-success.png`
  - `tmp/qa-student-contract-flow-real-sign/signed-contract.pdf`
