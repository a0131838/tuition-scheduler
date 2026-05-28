# TASK 2026-05-28 Sales / CS Independent Roles

## Goal

Add independent `SALES` and `CS` user roles so sales and customer-service staff can log in without receiving the full admin management surface.

## Scope

- Add `SALES` and `CS` to the `UserRole` enum.
- Add centralized staff-role helpers for resource-workspace access checks.
- Allow Sales/CS into the admin shell only through a scoped Resource Follow-up workspace.
- Keep owner management, archiving, student conversion, scheduling-ticket handoff, and system-user management admin-only.
- Add Sales/CS to the system-user create/update role selectors.

## Verification

- `npx prisma validate`
- `npx prisma generate`
- `npx tsx --test tests/staff-roles.test.ts tests/leads.test.ts`
- `npm run build`

## Risk

Low to medium. This touches authentication layout and role enum behavior. The main guardrail is that `requireAdmin()` remains restricted to existing admin/finance/manager access, while Sales/CS use resource-specific guards only.
