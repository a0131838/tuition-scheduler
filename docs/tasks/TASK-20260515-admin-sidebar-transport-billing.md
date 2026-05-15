# TASK-20260515-admin-sidebar-transport-billing

## Context

Manager/admin users could open the transport billing route directly, and the admin dashboard had a shortcut, but the left admin sidebar did not show the transport billing entry. This made the new transport reimbursement workflow look unavailable after manager login.

## Change

- Added `Finance Workbench / 财务工作台` to the admin sidebar `Finance & Review / 财务与审核` group.
- Added `Transport Billing / 交通费月结` to the same admin sidebar group.
- Added `Invoices & Receipts / 完整发票与收据` so the transport invoice follow-up flow is discoverable from the sidebar.

## Non-goals

- No transport billing business logic changes.
- No invoice, receipt, payment proof, attendance, package balance, payroll, scheduling, or permission changes.
- No OpenClaw changes.

## Verification

- `npm run build`

## Risk

Low. Navigation-only visibility change for admin/manager users.
