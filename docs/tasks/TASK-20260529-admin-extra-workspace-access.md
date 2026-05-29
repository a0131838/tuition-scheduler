# TASK 2026-05-29 Admin Extra Workspace Access

## Goal

Let selected admin users carry a focused Sales or CS workspace identity without changing their main `ADMIN` role.

## Scope

- Add `StaffWorkspace` and `UserWorkspaceAccess`.
- Seed Eva with CS workspace access.
- Seed Jasmine and zhao hongwei with Sales workspace access.
- Show extra workspace shortcuts for admin users with configured access.
- Let `/admin?workspace=cs` and `/admin?workspace=sales` render the focused Resource Follow-up dashboard while preserving full admin access.
- Keep pure `SALES` and `CS` role restrictions unchanged.

## Verification

- `npx prisma validate`
- `npx prisma generate`
- `npx tsx --test tests/staff-roles.test.ts tests/leads.test.ts`
- `npm run build`

## Risk

Low to medium. This adds a new access table and a seeded data migration. It does not change billing, packages, attendance, payroll, contracts, receipts, or scheduling logic.
