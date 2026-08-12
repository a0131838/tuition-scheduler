# Wang Jie cross-channel observer account

Release line: `2026-08-12-r361` (renumbered after integrating the concurrent r360 AI ticket-rule release).

## Request

Keep Wang Jie's existing staff identity but make it a strict observer account that can enter the web system, staff miniapp and AI workspace without changing anything.

## Implementation

- Add `User.isObserver` without introducing a new primary role, so the account keeps the existing broad ADMIN read scope.
- Sign observer state into the main web session token. Removing or changing the observer marker invalidates the stored session instead of restoring write access.
- Reject observer POST, PUT, PATCH and DELETE requests in middleware and reject request-context Prisma writes as a second boundary.
- Reject staff-miniapp mutation requests centrally, while preserving logout and all authorized reads.
- Delegate observer identities to AI as `VIEWER`, regardless of their formal system role.
- Add an owner-only observer toggle that revokes all active web and staff-miniapp sessions and records an audit event.
- Show persistent bilingual read-only notices in the web admin shell and staff miniapp home.
- Skip observer-triggered renewal, alert, health, action-center and shared-document initialization writes.

## Non-goals

- No changes to scheduling, lesson attendance, package balances, finance documents, receipts, payroll or ticket state logic.
- No shared passwords and no duplicate Wang Jie formal-system user.

## Verification

- `npx prisma generate`
- `npx tsc --noEmit`
- `npx tsx --test tests/observer-access.test.ts tests/ai-miniapp-delegation.test.ts tests/route-guards.test.ts`
- JavaScript syntax checks for the three changed staff-miniapp pages
- `npm run build` (246 pages)
- Production activation query confirms one Wang Jie observer user and zero stale sessions before new binding.

Final integration also includes the concurrently released r360 teacher-confirmation rules; the combined r361 head passed TypeScript, 24 focused tests, the 69-page Mini Program audit and the 247-page production build.
