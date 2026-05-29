# TASK 2026-05-29 Workspace Access Management Form

## Goal

Add a management form so the owner manager can turn Sales and CS focused workspaces on or off for system users.

## Scope

- Add an owner-manager-only API for updating `UserWorkspaceAccess`.
- Add Sales/CS checkboxes in System User Admin edit mode.
- Keep the main user role editor separate from workspace access.
- Keep protected manager-admin role/password rules unchanged.

## Verification

- `npx prisma validate`
- `npx prisma generate`
- `npx tsx --test tests/staff-roles.test.ts tests/leads.test.ts`
- `npm run build`

## Risk

Low to medium. This adds an access-management surface, so it is restricted to the owner manager. It does not change billing, packages, contracts, attendance, payroll, receipts, or scheduling logic.
