# TASK-20260421-direct-billing-invoice-gate-phase-1-and-2-release

## Why

Finance wants SGT Manage to stop treating a newly created direct-billing package as immediately schedulable before invoice work has started. The product direction agreed with ops and finance is:

- direct-billing chargeable packages must create an invoice draft together with package creation
- manager approval of that invoice is the first scheduling gate
- partner-settlement students stay outside this workflow
- receipt stays part of finance follow-up, not the first scheduling gate

This release bundles the first two safe phases:

- **Phase 1:** data model, invoice-draft creation, approval object, package/student/finance visibility
- **Phase 2:** soft interception across the main scheduling entry points, with strict super admin bypass retained for finance-gate blocks only

## Scope Shipped

### Included

- Prisma schema + migration for package finance gate fields and approvals
- package creation auto-creating:
  - direct-billing package
  - parent invoice draft
  - package invoice approval
- package gate status shown on:
  - package list
  - package billing
  - student detail
  - finance workbench
  - approvals inbox
- soft interception added to:
  - quick schedule
  - enrollments
  - class session create / generate / reschedule
  - booking approval scheduling flow
  - teacher generate sessions
  - ops execute scheduling flow
- copy and banners aligned so users are told to open package billing as the next step

### Excluded

- Phase 3 hard enforcement
- top-up full gate redesign
- receipt as the first scheduling gate
- partner-settlement workflow changes
- retroactive hard cleanup of old packages

## Policy Boundary

### Included

- direct-billing chargeable packages
- typical parent-billing packages with `settlementMode = null`

### Excluded

- partner-settlement packages
- `settlementMode = ONLINE_PACKAGE_END`
- `settlementMode = OFFLINE_MONTHLY`
- exempt complimentary / internal / migrated packages

## Data Layer

### New package gate fields

- `CoursePackage.financeGateStatus`
- `CoursePackage.financeGateReason`
- `CoursePackage.financeGateUpdatedAt`
- `CoursePackage.financeGateUpdatedBy`

### New approval object

- `PackageInvoiceApproval`

### Migration

- `prisma/migrations/20260421183000_add_package_invoice_gate_phase1/migration.sql`

## Core Behavior

### Direct-billing package creation

For a non-exempt direct-billing chargeable package:

1. create package
2. create invoice draft
3. create `PackageInvoiceApproval`
4. set package gate to `INVOICE_PENDING_MANAGER`

For partner / exempt package:

- no invoice gate object is required
- package gate stays `EXEMPT`

### Scheduling decision

Main shared helper:

- `lib/scheduling-package.ts`

Main new gate helper:

- `lib/package-finance-gate.ts`

Decision shape now distinguishes:

- no active package
- finance gate blocked
- schedulable

### Approval

Manager approval turns package gate into:

- `SCHEDULABLE`

Manager reject turns package gate into:

- `BLOCKED`

## Real QA Completed

### Migration QA

- confirmed the target database initially did **not** have the new fields/table
- applied `20260421183000_add_package_invoice_gate_phase1`
- verified:
  - `CoursePackage.financeGateStatus`
  - `CoursePackage.financeGateReason`
  - `CoursePackage.financeGateUpdatedAt`
  - `CoursePackage.financeGateUpdatedBy`
  - `PackageInvoiceApproval`

### Real flow QA

Using the test student `赵测试`:

1. created a new direct-billing chargeable package
2. confirmed invoice draft + approval row were auto-created
3. confirmed package started at `INVOICE_PENDING_MANAGER`
4. confirmed scheduling decision returned:
   - `PACKAGE_FINANCE_GATE_BLOCKED`
   - `Invoice approval is pending. Open package billing before scheduling.`
5. approved with a configured manager approver
6. confirmed package became `SCHEDULABLE`
7. confirmed an existing partner-settlement package stayed `EXEMPT`
8. cleaned up QA package / approval / invoice records afterwards

### UI QA

Captured screenshots:

- `tmp/qa-package-gate/package-billing-pending.png`
- `tmp/qa-package-gate/approvals-pending.png`
- `tmp/qa-package-gate/package-billing-approved.png`

These are evidence only and are not part of the deploy commit.

## Risks

- Migration must be present before runtime code deploy, or package pages / helpers will fail when reading missing columns.
- This release touches many scheduling entry points, so wording consistency matters to keep ops from assuming package logic broke.
- Partner exclusion must remain intact; this release keeps partner packages `EXEMPT`.
- Phase 2 is still soft enforcement because strict super admins can bypass `PACKAGE_FINANCE_GATE_BLOCKED`.

## Deployment Notes

Before deploy:

1. ensure release docs are in the same commit
2. ensure migration has already been applied or will be applied before the new runtime is used
3. push branch to origin because `quick_deploy.sh` hard-resets server to `origin/<branch>`

After deploy:

1. run `bash ops/server/scripts/quick_check.sh`
2. run `bash ops/server/scripts/new_chat_startup_check.sh`
3. recheck `/admin/login`
4. smoke-test:
   - package create
   - package billing approval
   - quick schedule warning path
   - partner package unaffected
