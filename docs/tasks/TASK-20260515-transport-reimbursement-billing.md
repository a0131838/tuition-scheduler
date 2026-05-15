# TASK-20260515 Transport Reimbursement Billing

## Context

Finance currently calculates parent transport reimbursement manually from lesson schedules for home lessons where parents agreed to pay taxi/transport costs. Because SGT Manage already tracks lesson sessions and attendance, Finance needs a month-end workflow to mark billable transport sessions and generate parent invoices without mixing this with teacher expense claims.

## Scope

- Add `Transport Billing / 交通费月结` under Finance.
- List held lessons by month and optional student filter.
- Let Finance mark a lesson as billable to the parent, set the transport amount, and add a note.
- Let Finance create one parent invoice for marked, uninvoiced transport rows for the selected student and month.
- Link invoiced transport rows back to the generated parent invoice PDF.
- Store transport billing flags separately in `AppSetting` so package balances, attendance rows, teacher expense claims, payroll, partner settlement, and OpenClaw are untouched.

## Files

- `lib/transport-billing.ts`
- `app/admin/finance/transport-billing/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/finance/workbench/page.tsx`
- `app/admin/page.tsx`

## Verification

- Real-data read check for `2026-03`: 45 students and 394 held lesson rows available for review.
- `npm run build`

## Risk

Low to medium. Invoice creation uses the existing parent invoice store and numbering. Finance must select the right student and mark only parent-agreed home lessons before creating an invoice.
