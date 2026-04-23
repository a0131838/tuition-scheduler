# TASK-20260423 Student Contract Intake + Renewal + Auto Invoice

## Goal

Rework the direct-billing student contract flow so it matches the real ops process end to end:

- before a student exists, ops can send a parent intake link
- parent submission creates the student draft inside SGT
- ops then completes the first-purchase package and commercial contract details
- the school then sends the final signing link
- signing automatically creates the matching invoice draft
- renewals skip parent-info collection and go straight to the formal contract path

## Scope

- Add a new pre-student parent-intake workflow:
  - send a public parent intake link before a student exists
  - collect only the parent/student profile fields ops actually needs up front
  - create the student record automatically after parent submission
- Add intake-side storage for:
  - intake token
  - intake status
  - submitted parent payload
  - linked student / package / contract ids
- Rework direct-billing contract states so ops sees:
  - intake pending
  - intake submitted
  - contract draft
  - ready to sign
  - signed / invoice created
- Add contract flow types:
  - `NEW_PURCHASE`
  - `RENEWAL`
- Rework first-purchase flow so:
  - parent intake happens before package creation
  - ops finishes package/commercial details afterwards
  - the system creates the first package and ready-to-sign contract together
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
- `prisma/migrations/20260423181500_add_student_parent_intakes/migration.sql`
- `lib/student-contract-template.ts`
- `lib/student-contract.ts`
- `lib/student-parent-intake.ts`
- `app/admin/students/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/packages/[id]/billing/page.tsx`
- `app/student-intake/[token]/page.tsx`
- `app/contract-intake/[token]/page.tsx`
- `app/contract/[token]/page.tsx`
- `app/api/exports/student-contract/[id]/route.ts`
- `docs/tasks/TASK-20260423-student-contract-intake-renewal-auto-invoice.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risks

- Medium. This release changes contract status progression, adds a new public intake-before-student path, adds renewal-mode behavior, and creates invoice drafts automatically after signing.
- The biggest runtime risks are:
  - duplicate student creation if intake submission is not guarded properly
  - duplicate invoice creation if the post-sign path is not idempotent
  - confusing ops UI if the wrong action is shown for the current contract stage

## Verification

- `npx prisma generate`
- `npx prisma migrate deploy`
- `npm run build`
- New-student intake QA:
  - create a parent intake link before any student exists
  - submit parent details through the intake flow
  - verify the student record is created automatically
  - use ops-side first-purchase setup to create the first package and ready-to-sign contract
  - sign the contract and verify invoice draft creation + package invoice approval creation
- Renewal QA:
  - create a renewal package for an existing student with prior contract data
  - verify renewal draft reuses the stored parent info
  - verify the flow skips intake and goes straight to contract drafting/signing
  - sign the renewal contract and verify invoice draft creation + package finance gate update
- Cleanup:
  - remove QA students, intakes, packages, contracts, approvals, and generated invoice drafts after validation
