# TASK-20260421-direct-billing-invoice-gate-phase-3-hard-block

## Why

Phase 1 and Phase 2 already introduced the direct-billing package invoice gate, automatic invoice-draft creation, manager approval, and soft interception across the main scheduling entry points. The remaining gap was that strict super admins could still bypass `PACKAGE_FINANCE_GATE_BLOCKED` in several scheduling paths. That meant the workflow was visible and mostly enforced, but not yet a true hard gate.

Finance and ops already agreed that:

- direct-billing chargeable packages must not proceed to scheduling before manager invoice approval
- partner-settlement packages stay outside this rule
- receipt remains a later finance-control step, not the first scheduling gate

So Phase 3 is the step that turns the policy into a real enforced scheduling rule.

## Goal

Remove the remaining finance-gate bypass behavior so a direct-billing chargeable package that is not yet `SCHEDULABLE` is blocked consistently across all scheduling entry points.

## Included

- quick schedule hard block
- enrollments hard block
- class session create / generate / reschedule hard block
- booking-link approval scheduling hard block
- teacher generate sessions hard block
- ops execute hard block for the relevant scheduling actions
- wording cleanup where pages still implied hard blocking would happen “later”

## Excluded

- no partner-settlement workflow changes
- no receipt-first gate
- no top-up redesign
- no change to unrelated strict-super-admin powers such as availability override behavior

## Policy Boundary

### Included

- direct-billing chargeable packages
- packages that are `INVOICE_PENDING_MANAGER` or `BLOCKED`

### Excluded

- partner-settlement packages
- `settlementMode = ONLINE_PACKAGE_END`
- `settlementMode = OFFLINE_MONTHLY`
- exempt complimentary / internal / migrated packages

## What Changed

### Hard block behavior

These paths no longer bypass `PACKAGE_FINANCE_GATE_BLOCKED`:

- `app/api/admin/enrollments/route.ts`
- `app/api/admin/classes/[id]/sessions/route.ts`
- `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
- `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
- `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`
- `app/api/admin/teachers/[id]/generate-sessions/route.ts`
- `app/api/admin/students/[id]/quick-appointment/route.ts`
- `app/api/admin/ops/execute/route.ts`
- `app/admin/students/[id]/page.tsx`
- `app/admin/classes/[id]/sessions/page.tsx`

### UI wording cleanup

- package billing now tells users that manager approval is required **before scheduling can continue**, instead of describing this as a later phase

## What Stayed the Same

- partner packages still remain `EXEMPT`
- `receipt` is still not the first scheduling gate
- `NO_ACTIVE_PACKAGE` remains a distinct failure from finance-gate blocking
- strict super admins still keep unrelated admin/availability powers, but no longer bypass finance-gate blocking

## Verification

- `npm run build`
- `npm run test:backend`
- source scan confirms no remaining scheduling runtime path uses a finance-gate bypass condition

## Deployment Note

Post-deploy QA should verify that a pending direct-billing package is blocked consistently from:

1. quick schedule
2. enrollments
3. create single session
4. generate weekly sessions
5. reschedule
6. booking approval
7. teacher generate sessions
8. ops execute
