# TASK-20260808-shared-package-transport-billing

## Context

Finance could create John’s July transport invoice but Jason’s six selected transport rows failed with `No student package found for invoice context`. Production data showed that Jason has no directly owned package because he is a verified shared student on John’s active package. The transport invoice resolver checked only direct package ownership.

## Change

- Carry the attendance `packageId` into each transport billing row.
- Resolve invoice context from the package actually used by the selected attendance rows.
- Accept the package only when the invoice student owns it or has a `CoursePackageSharedStudent` link.
- Keep `studentId` and `billTo` on Jason while retaining John’s package as the internal finance context.
- Show finance the invoice student, package relationship, session count and amount before creation.
- Reject mixed-package batches and unrelated packages.
- Preserve a shared-package fallback for legacy attendance rows without a package ID.
- Add focused regression coverage and include it in the backend test suite.

## Non-goals

- Do not create a package for Jason.
- Do not merge Jason’s rows into John’s issued invoice.
- Do not change John’s `RGT-202608-0007` invoice.
- Do not alter package balances, attendance, deductions, receipts, schedules or existing transport selections.
- Do not create Jason’s invoice automatically; finance remains responsible for the final checked action.

## Verification

- `npx tsx --test tests/transport-billing.test.ts` - 5 passed.
- `npm run test:backend` - 179 passed.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.
- Read-only production check confirmed all six selected Jason rows use package `3b7f99d6-6336-4e36-ab9c-1f28c7dd5796`, owned by John and shared to Jason.

## Risk

Low. The change is limited to package lookup and pre-create presentation in transport billing. Existing financial documents and operational records are not migrated or rewritten.
