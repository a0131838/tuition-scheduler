# TASK-20260710-miniapp-parent-staff-foundation

## Context

Zhao is preparing the native WeChat miniapp `博思学业管家` for parent access and staff mobile high-frequency work. The existing SGT Manage system already owns student, package, finance, feedback, ticket, and staff user data, so the first production-ready foundation should reuse the current Next.js backend and `https://sgtmanage.com` rather than moving business logic into WeChat Cloud Development.

## Change

- Added parent miniapp data models, sessions, bind invites, student links, audit records, and parent-facing miniapp APIs.
- Added parent miniapp finance, PDF download, request creation, attachment upload, and request detail flows.
- Added miniapp notification outbox and course-reminder queue foundation.
- Added admin tools for parent portal opening, notification queue review, staff miniapp binding codes, and mobile parent-request handling.
- Added staff miniapp binding/session models and staff miniapp APIs for login, binding, profile, parent-request list/detail, and status updates.
- Added the native miniapp project under `miniapp/boss-academic-parent`, including parent and staff pages.
- Set miniapp `apiBaseUrl` to `https://sgtmanage.com` for formal domain testing.

## Non-goals

- Did not enable WeChat Pay.
- Did not send real WeChat subscription messages yet because template IDs are still needed.
- Did not move the existing backend to WeChat Cloud Development.
- Did not change scheduling, attendance deduction, package ledger, receipts, payroll, partner settlement, transport billing, Business Accounts, or OpenClaw flows.

## Verification

- `npx prisma generate`
- `npx prisma validate`
- `npx prisma migrate status`
- `npx tsc --noEmit`
- Miniapp JS syntax and JSON parse checks.
- Mock staff miniapp binding/login/request-list/status-update smoke checks against local dev server.
- `npm run build`

## Risk

Medium. The release adds new database tables and public miniapp API surfaces, but the changes are additive and isolated from high-risk finance, package ledger, scheduling, payroll, and OpenClaw modules. Production miniapp usage still requires WeChat platform domain whitelisting, `WECHAT_MINIAPP_SECRET`, and subscription template IDs.
