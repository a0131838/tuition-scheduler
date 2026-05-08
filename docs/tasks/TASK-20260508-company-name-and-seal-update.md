# TASK 2026-05-08 Company Name And Seal Update

## Problem

Finance generated an invoice and saw the old company name, `Reshape Great Thinkers`, instead of the current company name.

## Confirmed Inputs

- Company name: `GT Educational Institute Pte. Ltd.`
- Logo: unchanged
- Finance seal: `public/gt_edu_seal.png`
- Uploaded Excel invoice/receipt templates should not be redesigned; only necessary text/stamp references should change.

## Change

- Replaced the old company name in generated finance/legal document exports.
- Updated remittance `Account name` on invoice PDFs to `GT Educational Institute Pte. Ltd.`.
- Switched sealed partner invoice/detail exports from `reshapeSeal.png` to `gt_edu_seal.png`.

## Template Check

- `GT Invoice Template 24.04.26.xlsx` visible cells already show `GT Educational Institute Pte. Ltd.` and the same account name.
- `GT Receipts Template 24.04.26.xlsx` visible cells already show `GT Educational Institute Pte. Ltd.`.
- No visible template rewrite was needed.

## Not Changed

- Logo files
- Layout
- Invoice numbers
- Receipt numbers
- Billing amounts
- Approval logic
- Payment status
- Package deduction
- Scheduling
- Attendance
- Payroll
- Partner settlement
- Expense claims
- OpenClaw

## Verification

- `rg` scan confirmed the old company name no longer appears in app/lib document generation code.
- `rg` scan confirmed sealed partner exports reference `public/gt_edu_seal.png`.
- `npx tsc --noEmit`
- `npx next build`
