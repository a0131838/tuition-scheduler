# TASK-20260713-full-care-core-workspace

## Context

The business is starting a full-care service for pre-university students, including academic management, school coordination, family reassurance, and broader coordination for students without a parent living locally. The first pilot students must be selectable and changeable rather than hard-coded.

## Change

- Add an isolated `CARE` staff workspace.
- Add care engagement, member, plan, activity, and task models with additive migration only.
- Add `/admin/care` for student search, project creation, and project overview.
- Add `/admin/care/[id]` for service scope, owners, stage plans, five-part evidence updates, risk handling, and tasks.
- Add confirmed medical, transport, host-family, holiday-care, and visa/pass services to the standard scope vocabulary.
- Keep daily status confirmation and after-hours onsite support conditional.
- Separate internal notes from parent-summary drafts.
- Preserve owner history, audit configuration changes, and use optimistic locking for project/task updates.
- Show email and role in owner selection because two Jasmine accounts exist.

## Non-goals

- Do not publish care content to the parent miniapp in this release.
- Do not automatically create or activate projects for the 14 candidate students.
- Do not change scheduling, lesson deduction, packages, partner settlement, payroll, invoices, receipts, Business Accounts, or existing academic reports.
- Do not add medical diagnosis, immigration legal advice, 24-hour monitoring, or unlimited onsite support promises.

## Verification

- `npx prisma validate`
- `npx tsc --noEmit`
- `npm run test:backend` passes 45/45.
- `npm run build` passes with `/admin/care` and `/admin/care/[id]` in the 192-page build.
- Migration safety tests reject mutation of existing teaching and finance tables.
- Read-only production baseline captures core row counts, package/ledger totals, settlement totals, and hashes for protected finance settings.
- `prisma migrate status` confirms the care migration is pending before deploy.

## Risk

Medium and isolated. Runtime depends on the additive migration being applied before restart. The new module has no write path into existing teaching or finance tables, and no pilot student or parent-facing content is created automatically.
