# TASK-20260711-parent-request-formal-fields

## Context

The first staff-assisted parent-request release stored the parent-facing summary, internal original message, communication source, and completion result in existing Ticket text fields. It worked for the first operating loop, but made permissions, reporting, and future automation depend on parsing tagged text.

## Change

- Add formal nullable Ticket fields for parent visibility, public summary, internal note, communication source, completion result, and assisted-entry employee identity.
- Mark current `家长小程序` Ticket records parent-visible during migration and backfill structured values from the legacy tagged summary when available.
- Write formal fields for both parent-submitted and employee-assisted requests.
- Read formal fields first, with a legacy-summary and `finalSchedule` fallback for historic records.
- Keep accepting the old `finalSchedule` request payload while the staff miniapp and mobile admin client use the semantic `completionResult` payload.
- Require `parentVisible` before a parent can retrieve a request detail.

## Non-goals

- No changes to normal Ticket Center scheduling workflows, attendance, package balance, finance, receipts, payroll, or teacher workload.
- No automatic WeChat group reading, automatic classification, or automatic subscription-message delivery.
- No deletion or irreversible rewrite of the historical Ticket `summary` or `finalSchedule` text.

## Verification

- `npx prisma generate`
- `npx tsc --noEmit`
- Miniapp JavaScript syntax and JSON parse checks.
- `npm run build`
- Production migration status, PM2 process, `/admin/login`, and version alignment after deploy.

## Risk

Medium. This includes a production schema migration, but all new fields are nullable except the defaulted visibility flag. Legacy read fallbacks stay in place, and the migration preserves original Ticket text fields.
