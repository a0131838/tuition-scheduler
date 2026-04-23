# TASK-20260423 Student Contract Intake + Renewal + Auto Invoice

## Goal

Rework the direct-billing student contract flow so it matches the real ops process:

- first purchase sends a parent-info intake link first
- ops completes the commercial contract details afterwards
- the school then sends the final signing link
- signing automatically creates the matching invoice draft
- renewals skip parent-info collection and go straight to the formal contract path

## Scope

- Add business-facing contract states for:
  - intake pending
  - intake submitted
  - contract draft
  - ready to sign
  - signed / invoice created
- Add contract flow types:
  - `NEW_PURCHASE`
  - `RENEWAL`
- Add contract-side storage for:
  - reusable parent profile data
  - ops-entered business draft fields
  - linked invoice metadata
- Rework package billing contract actions so:
  - first purchase starts with `Send parent info link`
  - renewal starts with `Create renewal contract`
  - ops can save the business draft before generating the final sign link
  - signed contracts show the linked invoice result
- Rework the public intake page so:
  - parents only submit profile details
  - renewal links show `No intake needed`
- Rework the public signing page so:
  - it clearly represents the final contract
  - successful signing confirms the invoice draft was prepared
- Auto-create or auto-link a parent invoice draft after signing.

## Non-goals

- No partner-settlement contract workflow.
- No multi-signer or OTP workflow.
- No receipt automation change.
- No new scheduling gate tied to contract signing.

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/20260423154500_student_contract_flow_rework/migration.sql`
- `lib/student-contract-template.ts`
- `lib/student-contract.ts`
- `app/admin/packages/[id]/billing/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/contract-intake/[token]/page.tsx`
- `app/contract/[token]/page.tsx`
- `app/api/exports/student-contract/[id]/route.ts`
- `docs/tasks/TASK-20260423-student-contract-intake-renewal-auto-invoice.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risks

- Medium. This release changes contract status progression, adds renewal-mode behavior, and creates invoice drafts automatically after signing.
- The biggest runtime risk is duplicate invoice creation, so the post-sign path must remain idempotent and reuse/link a matching invoice when possible.
- Contract UI is now more selective by stage, so hidden buttons must still leave one clear next action for ops.

## Verification

- `npx prisma generate`
- `npx prisma migrate deploy`
- `npm run build`
- Local QA helper:
  - create first-purchase package and contract
  - submit parent intake
  - save business draft
  - prepare sign link
  - sign contract
  - verify status becomes `INVOICE_CREATED`
  - verify invoice draft is linked/created automatically
- Renewal QA:
  - create renewal package and contract
  - verify intake link shows `No intake needed`
  - save renewal draft
  - prepare sign link
  - sign contract
  - verify invoice draft is linked/created automatically
- Cleanup:
  - remove QA packages, contracts, and generated invoice drafts after validation
