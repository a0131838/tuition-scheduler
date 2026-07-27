# TASK-20260727-singapore-school-guide-release

## Context

Families need a public Singapore school information product inside the existing web and WeChat surfaces. The first release must use official sources, keep uncertain fields explicit, and avoid changing the existing parent, employee and teaching workflows.

## Change

- Add public web pages for school pathways, school directory, detail, comparison, assessment, consultation and privacy.
- Add official-source records for MOE pathways and the IB directory, with detailed verification for fifteen priority international schools.
- Add first-year fixed-cost ranges with included and optional items separated.
- Add verification status, applicable year, verified date, next review date and change summary.
- Add matching public miniapp pages and an unauthenticated School Guide entry on the existing login screen.
- Route an explicitly submitted new inquiry to Zhao Hongwei while preserving the owner of any matching open Lead.

## Non-goals

- No database migration.
- No automatic school application submission.
- No guaranteed placement, grade allocation or admission outcome.
- No change to scheduling, attendance, packages, payroll, finance, feedback, renewal, Ticket or role-permission logic.
- No production data creation during deployment verification.

## Verification

- `npx tsx --test tests/school-guide-assessment.test.ts tests/school-guide-schools.test.ts`
- `npm run test:backend`
- `npx tsx --test tests/*.test.ts`
- `npm run build`
- `npx tsc --noEmit --pretty false`
- `npm run miniapp:audit-release`
- `git diff --check`

## Risk

Low-to-medium. The product is additive and most paths are read-only; the inquiry form is the only new write and requires explicit user submission and validation. School fees and admissions facts are time-sensitive, so detailed records carry review metadata and partial records remain visibly limited.
