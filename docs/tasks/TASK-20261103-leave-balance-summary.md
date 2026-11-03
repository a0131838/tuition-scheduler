# TASK-20261103-leave-balance-summary

## Context

Finance reported that `/staff/hr` showed only one net leave balance, so staff could not distinguish utilised, pending and remaining leave. A read-only production check for Sharilyn found posted grants/adjustments, an expired credit, approved usage and pending requests. Policy entitlement alone does not represent the available ledger balance.

## Change

- Add one shared leave summary based on the posted ledger and all active leave requests; show it in employee self-service and the HR employee page.
- Extend the staff mini-program API and native leave page with the same fields.
- Use the Singapore calendar year for the 1 January opening balance. Show approved ended leave as taken; approved in-progress and upcoming separately. Pending applications are excluded from the posted available balance and included only in the projection.
- Use the existing eight-hour accounting-day conversion. Unpaid and other leave have request activity but no controlled entitlement. Flag any mismatch between approved requests and posted usage/restoration entries.

## Non-goals

- No entitlement posting, carry-forward, historical adjustment, approval rule or data migration.
- No alteration to pay, packages, scheduling or finance records.

## Verification

- `npx tsx --test tests/hr-leave-summary.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- Read-only production query for Sharilyn compared posted entries, expiration and requests; no data writes.
- `npm run miniapp:audit-release` before WeChat upload.

## Risk

Low for the server: this is a read-only summary. An existing historical mismatch is surfaced to HR rather than silently corrected. The native mini-program page requires its own client release and physical-device check after server deployment.
