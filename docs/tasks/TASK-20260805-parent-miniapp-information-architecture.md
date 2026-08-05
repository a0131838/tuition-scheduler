# TASK-20260805-parent-miniapp-information-architecture

## Context

The parent mini program exposed too many equal-weight cards, repeated finance and service information across tabs, and made ordinary tuition records appear too close to Full Care agreements. Parents need a calm answer to what is happening, what they must do and when the team will update them next.

## Change

- Replaced the five-tab structure with Home, Progress, Schedule and My.
- Added one dashboard endpoint for stable home loading, freshness and unread state.
- Split progress into latest updates, formal reports and purchased entitlements; Full Care-only material is conditional.
- Moved finance, signed contracts, service requests and WeChat reminder settings into My.
- Added parent-authenticated downloads for the linked student's signed or invoiced contracts.
- Simplified schedules, feedback lists, monthly scheduling and request intake into parent-readable task flows.

## Non-goals

- No lesson, package, invoice, receipt, contract or Full Care record is migrated or rewritten.
- No channel commission is stored in the product.
- No WeChat message is sent automatically by this release.

## Verification

- `npm run test:backend` — 174 passed.
- `npm run miniapp:audit-release` — passed for 62 pages.
- `npx tsc --noEmit --incremental false` — passed.
- `npm run build` — passed.
- WeChat Developer Tools opened and compiled the project with automation enabled.

## Risk

Medium because the parent information architecture changes materially. Data writes remain limited to existing request/subscription actions and a dashboard-view audit; finance and contract access retain student-link permissions.
