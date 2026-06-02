# Renewal Contract Invoice Safeguards

- Release: `2026-06-02-r174`
- Date: `2026-06-02`
- Owner: Codex

## Goal

Prevent duplicate parent invoices when finance manually creates an invoice before a renewal contract is signed.

## Changes

- Added renewal-contract invoice choice storage in `AppSetting`.
- Renewal sign-link preparation now requires staff to choose:
  - create a new invoice, or
  - link a selected existing invoice.
- Linking a receipted invoice requires a confirmation note.
- Creating a new invoice when similar package invoices already exist requires a confirmation note.
- Renewal signing now follows the saved choice and records the selected invoice mode in contract events.
- Renewal signing keeps the package invoice gate schedulable when the linked invoice was already manager-approved.
- Parent invoices linked to contract history are blocked from direct deletion.
- Package billing and finance document views now show manual/contract-created source and contract-link status.
- Signed/invoiced contracts can be voided with a required reason while keeping invoice/receipt records for finance handling.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Read-only Prisma verification on Coco package `1df7bb95-8de1-4c10-bd7a-6a935af6af0e` confirmed:
  - `RGT-202605-0011` has receipt total `8800`.
  - The invoice is linked to contract history.
  - The option display path marks it as receipted, contract-created, and linked to multiple contracts.

## Risk

- Medium: direct-billing renewal contract signing and parent invoice deletion behavior changed.
- Existing signed renewal contracts without a saved invoice choice are unaffected unless staff tries to reuse or re-prepare their sign link.
- Receipt creation, receipt approval, receipt PDF export, attendance deduction, payroll, partner settlement, transport billing, and Business Accounts were not changed.
