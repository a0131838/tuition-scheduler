# TASK 2026-05-28 Resource Owner And Archive Enhancements

## Context

The first Resource Follow-up CRM release used existing admin users as owner choices. After testing, the owner list needed to be maintained independently so sales/customer-service names can be assigned without changing broader login roles. Operators also needed safe cleanup for test resources and a way to keep old or inactive resources out of the daily queue.

## Shipped Scope

- Added `LeadResourceOwner` as an independent resource owner list.
- Seeded owner records from existing admin users and existing lead owner names during migration.
- Changed resource creation and filtering to use active resource owners rather than admin users only.
- Added `/admin/leads/owners` so admin users can add, edit, activate, and deactivate owner names.
- Added resource detail editing for source, owner, parent/student profile, needs, status, intent, and lost reason.
- Added lead archive/restore fields and archived filtering.
- Added a `My resources` filter and aligned CSV export with that filter.
- Added a guarded physical delete path for clearly marked `TEST` resources only.
- Extended the lead CSV export with archive metadata.

## Out Of Scope

- No new Sales or CS login role was added.
- No billing, package, contract, receipt, attendance, payroll, teacher cost, scheduling conflict, or OpenClaw logic was changed.
- No automatic deletion is performed for real resources.

## Verification

- `npx prisma validate`
- `npx prisma generate`
- `npx tsx --test tests/leads.test.ts`
- `npm run build`

## Release

- Release ID: `2026-05-28-r155`
- Branch: `feat/strict-superadmin-availability-bypass`
