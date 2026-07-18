# TASK-20260718-miniapp-staff-multi-account

## Context

Jasmine uses two legitimate web accounts: one ADMIN account for management work and one TEACHER account linked to her teacher profile. The original employee-miniapp model enforced one employee account per WeChat OpenID, so binding the second account would overwrite the first binding and make safe role switching impossible.

Read-only production inspection on 2026-07-18 confirmed:

- Jasmine's ADMIN account exists and has no miniapp binding.
- Jasmine's TEACHER account exists, has a linked teacher profile and has one miniapp binding.
- The production database still carries the original `StaffMiniappBinding_wechatOpenId_key` unique index expected by the migration.

## Change

- Replace single-OpenID uniqueness with a composite unique binding on WeChat OpenID plus employee user ID.
- Store the verified WeChat OpenID on newly created employee-miniapp sessions.
- Return an explicit account choice when a verified WeChat has multiple active employee bindings.
- Add an authenticated account-list/switch endpoint scoped to the session's verified WeChat identity.
- Add native-miniapp account-choice, account-management, additional-binding and workbench-switching UI.
- Preserve the two web users, their passwords, roles, teacher link and separate audit ownership.

## Non-goals

- Do not merge ADMIN and TEACHER into one user.
- Do not change web login or web UI.
- Do not add or alter scheduling, attendance, package, finance, payroll, parent or notification writes.
- Do not automatically bind Jasmine's ADMIN account; an administrator must still generate its one-use binding code and Jasmine must confirm it in her own WeChat.

## Verification

- `npx prisma generate`
- `DATABASE_URL=... DIRECT_DATABASE_URL=... npx prisma validate` with non-network validation placeholders
- `npx tsc --noEmit`
- `npx tsx --test tests/miniapp*.test.ts` (`41/41`)
- `npm run test:backend` (`79/79`)
- `npm run build` (`195` pages)
- `git diff --check`
- WeChat Developer Tools CLI preview for AppID `wxe7017f8545e8ad49` (`355.4 KB`)

## Risk

Medium. The migration changes binding uniqueness but does not delete or rewrite existing binding data. New account-switch sessions are authorized only through the verified WeChat OpenID stored on the current employee session. Sessions issued before this release lack that nullable identity field and therefore must re-login before switching.
