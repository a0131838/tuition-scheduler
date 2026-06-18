# TASK 2026-06-18 Pre-Approved Scheduling Exception

## Context

Some students need lessons scheduled before contract and invoice completion. The system already supports manual invoice-gate exemption through `EXEMPT`, but the exemption did not capture who approved the risk, why it was approved, or when follow-up should happen.

## Change

- Added pre-approved scheduling exception fields to the package creation form when staff manually check `Exempt this package from invoice gate`.
- Required `Approved by` and `Exception reason` for manual direct-billing exemptions.
- Added optional `Max pre-approved minutes` and `Follow-up due` fields.
- Stored the exception details in existing `CoursePackage.financeGateReason` and package `note`.
- Added server-side validation so direct API calls cannot create a manual scheduling exception without approver and reason.

## Non-Goals

- No database schema change.
- No change to scheduling eligibility logic.
- No change to attendance deduction or package balance ledger logic.
- No change to invoice numbering, receipts, contracts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`

## Operator SOP

1. Create the package normally.
2. For a direct-billing student approved to start lessons before invoice/contract completion, check `Exempt this package from invoice gate`.
3. Fill `Approved by`, `Exception reason`, and optionally `Max pre-approved minutes` plus `Follow-up due`.
4. Create the package.
5. Schedule lessons as usual; the package remains `EXEMPT`, with the approval context visible in package finance-gate reason and notes.
