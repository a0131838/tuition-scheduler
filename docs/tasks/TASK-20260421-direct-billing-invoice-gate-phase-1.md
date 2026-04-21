# TASK-20260421-direct-billing-invoice-gate-phase-1

## Why

Finance wants SGT Manage to stop allowing a normal direct-billing package to be created and then used for scheduling before invoicing work has started. The goal is to reduce omitted invoices and force a cleaner front-end finance handoff before ops assigns lessons or teachers. At the same time, this must not accidentally block partner-settlement students, and it must not repurpose the existing `CoursePackage.status = ACTIVE/PAUSED` meaning because many current scheduling flows already depend on that status.

## Phase 1 Goal

Implement the first safe phase of the invoice-before-scheduling control for **direct-billing chargeable packages only**:

- add an explicit package finance-gate layer without changing current `ACTIVE` package semantics
- create invoice drafts together with new direct-billing chargeable packages
- create a manager-approval object for package invoice gating
- expose the gate status clearly on package / student / finance pages
- surface pending package-invoice approvals in the approval inbox
- do **not** hard-block all scheduling APIs yet in Phase 1

This phase is about making the gate visible, consistent, and reviewable before hard enforcement.

## Explicit Scope

- direct-billing chargeable packages only
- package creation flow
- package billing / finance visibility
- manager approval object and inbox visibility
- UI state and warning copy
- helper functions that can later be reused for Phase 2/3 hard blocking

## Explicit Non-Scope

- no hard scheduling API block yet
- no partner-settlement workflow changes
- no receipt-as-first-gate rule
- no full top-up freeze logic in Phase 1
- no forced retroactive cleanup of old packages

## Policy Boundary

### Included

- `CoursePackage` rows that are direct-billing and chargeable
- typical parent-billing packages with `settlementMode = null`

### Excluded

- partner-settlement students
- packages with `settlementMode = ONLINE_PACKAGE_END`
- packages with `settlementMode = OFFLINE_MONTHLY`
- complimentary / free / internal / migrated packages that are explicitly exempt

## Current Code Reality

### Current scheduling decision rule

The system currently treats `CoursePackage.status === ACTIVE` as the main schedulable signal in many places:

- `lib/scheduling-package.ts`
- `app/api/admin/students/[id]/quick-appointment/route.ts`
- `app/api/admin/enrollments/route.ts`
- `app/api/admin/classes/[id]/sessions/route.ts`
- `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
- `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
- `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`

Because of this, Phase 1 must **not** redefine `ACTIVE`.

### Current invoice path

Parent-billing invoices are currently created separately from package creation:

- `app/admin/finance/student-package-invoices/page.tsx`
- `app/admin/packages/[id]/billing/page.tsx`
- `lib/student-parent-billing.ts`

### Current approval base

The codebase already has approval patterns for:

- receipts
- teacher payroll
- expense claims

but not yet for package-invoice gate approvals.

## Proposed Data Model

### 1) Extend `CoursePackage`

Add a dedicated finance-gate layer instead of overloading `status`.

Suggested fields:

- `billingScope BillingScope @default(DIRECT)` or equivalent direct/partner/exempt discriminator
- `invoiceGateRequired Boolean @default(false)`
- `invoiceApprovalRequired Boolean @default(false)`
- `financeGateStatus PackageFinanceGateStatus @default(EXEMPT)`
- `financeGateReason String?`
- `financeGateUpdatedAt DateTime?`
- `financeGateUpdatedBy String?`

Suggested enum:

```prisma
enum PackageFinanceGateStatus {
  EXEMPT
  INVOICE_REQUIRED
  INVOICE_PENDING_MANAGER
  SCHEDULABLE
  BLOCKED
}
```

If the team prefers a separate table instead of package fields, Phase 1 can still ship with package-level fields first for simpler reads. A separate approval table is still recommended for auditability.

### 2) Add package-invoice approval table

Suggested Prisma model:

```prisma
model PackageInvoiceApproval {
  id                 String   @id @default(uuid())
  packageId          String
  invoiceId          String
  status             String   // PENDING_MANAGER / APPROVED / REJECTED
  submittedBy        String
  submittedAt        DateTime @default(now())
  managerApprovedBy  String?
  managerApprovedAt  DateTime?
  managerRejectReason String?
  updatedAt          DateTime @updatedAt

  package CoursePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@index([packageId])
  @@index([status, submittedAt])
}
```

Notes:

- `invoiceId` will reference the parent-billing invoice item ID stored in `parent_billing_v1`
- keep it as a string field for Phase 1 because parent invoices currently live in AppSetting JSON, not Prisma

## Core Helper Layer

Create a dedicated helper, for example:

- `lib/package-finance-gate.ts`

Suggested responsibilities:

- decide whether a package is inside this rule
- decide whether a package is exempt
- derive the correct gate status for newly created packages
- create manager-approval rows for invoice gating
- expose one shared function for future hard blocking, e.g.
  - `getPackageFinanceGate(package)`
  - `assertPackageFinanceGateAllowsScheduling(package)`

Suggested decision order:

1. partner-settlement package -> `EXEMPT`
2. explicit exempt mode -> `EXEMPT`
3. direct-billing chargeable package with no invoice -> `INVOICE_REQUIRED`
4. direct-billing chargeable package with invoice draft pending manager -> `INVOICE_PENDING_MANAGER`
5. approved invoice gate -> `SCHEDULABLE`
6. rejected invoice gate -> `BLOCKED`

## Package Creation Flow Changes

### Current

- package can be created by `app/api/admin/packages/route.ts`
- no invoice draft is required

### Phase 1 target

For direct-billing chargeable packages:

1. create the package
2. create invoice draft immediately
3. create `PackageInvoiceApproval`
4. set package gate to `INVOICE_PENDING_MANAGER`
5. return response with:
   - `packageId`
   - `invoiceId`
   - `financeGateStatus`
   - recommended next page

For exempt / partner packages:

- package creation remains allowed without invoice draft
- gate status should be `EXEMPT`

### Files to change

- `app/api/admin/packages/route.ts`
- `app/admin/packages/PackageCreateFormClient.tsx`
- `lib/student-parent-billing.ts`
- new helper `lib/package-finance-gate.ts`

## UI / UX Changes in Phase 1

### Package creation

Update package create form to make billing scope explicit:

- `Chargeable direct-billing`
- `Partner settlement`
- `Exempt / free / internal / migrated`

For chargeable direct-billing packages:

- invoice draft creation should be automatic
- page copy should state:
  - `This package will stay unschedulable until invoice manager approval is completed.`
  - `该课包在发票经理审批完成前不会进入可排课状态。`

### Package list

Show a new status chip:

- `Exempt`
- `Invoice required`
- `Pending manager approval`
- `Schedulable`
- `Blocked`

Primary file:

- `app/admin/packages/page.tsx`

### Package billing page

Show:

- gate status
- linked invoice draft
- approval state
- next required action

Primary file:

- `app/admin/packages/[id]/billing/page.tsx`

### Student detail page

Show:

- direct warning when the current package exists but is not yet schedulable because of invoice gate
- recommended next action:
  - open package billing
  - open finance invoice workbench

Do not hard-disable quick schedule yet in Phase 1, but show visible warning and future block copy.

Primary file:

- `app/admin/students/[id]/page.tsx`

### Finance workbench

Show a new lane / summary count:

- packages pending invoice manager approval

Primary file:

- `app/admin/finance/workbench/page.tsx`

### Approval inbox

Add a new inbox type:

- `PACKAGE_INVOICE`

Add a new manager lane item with:

- package
- student
- course
- invoice number
- submitter
- pending since

Primary file:

- `lib/approval-inbox.ts`
- `app/admin/approvals/page.tsx`

## Approval Actions in Phase 1

Add manager-side actions:

- approve package invoice
- reject package invoice

On approve:

- update approval row -> `APPROVED`
- package gate -> `SCHEDULABLE`

On reject:

- update approval row -> `REJECTED`
- package gate -> `BLOCKED`
- require reject reason

Suggested placement:

- package billing page
- approval inbox detail action

## Scheduling API Work in Phase 1

Phase 1 should **prepare** for future blocking but not enforce it everywhere yet.

Recommended in Phase 1:

- add a shared helper call path
- log and expose gate failures
- optionally return warning metadata to UI
- do not fully reject yet except maybe behind a flag

Future Phase 2/3 target files:

- `app/api/admin/students/[id]/quick-appointment/route.ts`
- `app/api/admin/enrollments/route.ts`
- `app/api/admin/classes/[id]/sessions/route.ts`
- `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
- `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
- `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`

Suggested shared future error code:

- `PACKAGE_FINANCE_GATE_BLOCKED`

Suggested future copy:

- `This package is not schedulable yet because invoice approval is pending.`
- `该课包发票待管理审批，暂时不能排课。`

## Top-up Handling in Phase 1

Do not fully solve top-up gating in Phase 1.

Phase 1 recommendation:

- top-up path should be marked as a known follow-up item
- direct-billing chargeable top-up should eventually create a new invoice draft and gate the newly sold value
- do not freeze old approved balance in Phase 1

Files to revisit later:

- `app/api/admin/packages/[id]/top-up/route.ts`
- `app/admin/_components/PackageEditModal.tsx`

## Historical Data Strategy

Do not retroactively hard-block old packages.

Recommended migration rules:

1. package with historical invoice/receipt evidence -> initialize as `SCHEDULABLE`
2. package clearly partner-settlement -> `EXEMPT`
3. package marked internal/migrated/free -> `EXEMPT`
4. new packages created after release -> new gate rules apply

Migration script or one-off backfill should be included in Phase 1 work.

## Rollout Plan

### Step 1

- schema changes
- helper layer
- backfill script

### Step 2

- package create flow creates invoice draft + approval row
- package / student / finance / approval UI shows gate state

### Step 3

- approval inbox and manager actions work
- package gate moves to `SCHEDULABLE` after approval

### Step 4

- observe real usage before hard API block

## Recommended Implementation Order

1. Prisma schema + migration
2. `lib/package-finance-gate.ts`
3. package create API
4. package create form UI
5. package billing page
6. approval inbox integration
7. student detail visibility
8. finance workbench summary
9. migration/backfill script
10. QA with direct-billing vs partner-settlement cases

## QA Checklist

- creating a direct-billing chargeable package auto-creates invoice draft
- the new package enters `INVOICE_PENDING_MANAGER`
- creating a partner-settlement package stays `EXEMPT`
- creating an exempt package stays `EXEMPT`
- approval inbox shows pending package-invoice item
- manager approve flips package to `SCHEDULABLE`
- manager reject flips package to `BLOCKED`
- package list and package billing show the same gate state
- student detail shows warning for non-schedulable direct-billing package
- existing historical partner packages remain unaffected
- existing historical invoiced direct-billing packages remain usable after backfill

## Risks

- redefining `ACTIVE` would break too many current flows, so this plan avoids that
- top-up gating is intentionally postponed from full enforcement
- AppSetting-based parent invoice storage means approval rows must keep invoice ID as string, not Prisma relation for now
- if the team wants hard blocking too early, ops could get stuck before UI and inbox are ready

## Recommendation

Phase 1 should ship as a visibility + approval + automatic invoice-draft phase first.  
Do **not** hard-block scheduling until the team confirms:

- direct-billing package creation flow is stable
- approval inbox is usable
- partner students are fully exempt
- historical packages are safely backfilled
