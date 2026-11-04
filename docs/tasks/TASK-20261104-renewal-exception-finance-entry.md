# TASK-20261104-renewal-exception-finance-entry

## Context

During SOP screenshot capture after r500, a synthetic Finance account was redirected from the new paid-renewal exception page to the teacher-payroll page. `app/admin/layout.tsx` allowed Finance to access Package Billing but had not allowlisted either new exception route. This prevented Finance from using the workflow despite the action-level role checks.

## Change

- Allow Finance through the admin layout only for the exact outstanding-signature list and package-specific `/contract/renewal-exception` route.
- Link the current unsigned tuition renewal from Package Billing directly to the exception page. The ordinary contract workspace remains outside Finance's existing route allowance.

## Non-goals

- No additional Finance access to general contract editing, other packages or manager-only approval actions.
- No change to the r500 cash, receipt, invoice, snapshot, audit or top-up rules.

## Verification

- TypeScript and production build passed.
- On an isolated PostgreSQL database with synthetic accounts and a full approved cash receipt, Playwright loaded the new page as Finance, showed the request form, then showed manager approval, Finance activation and the outstanding-signature list at their respective stages. No production financial record was used for screenshots.
- The standard release gate and online health/version checks remain required.

## Risk

Low: access is limited to two exact Finance routes and the existing business-function permission checks still run. Roll back application code if navigation regresses; retain financial and audit data.
