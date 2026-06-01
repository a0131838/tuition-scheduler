# Business Accounts cleaner workflow and receipt fields

- Date: 2026-06-01
- Release: 2026-06-01-r167
- Scope: Business Accounts workspace only.

## Request

The first Business Accounts page felt too crowded because account profile, invoice creation, document actions, and payment information were all on one screen. Receipt/payment details also needed to follow the same operational pattern used by student and New Oriental receipts.

## Implementation

- Split the Business Accounts page into workflow tabs:
  - Documents & payment
  - Create invoice
  - Company profile
  - Add company
- Added a payment-destination summary on the Documents & payment tab so finance can see the company bank-transfer setup before recording receipts.
- Updated business receipt/payment capture to include:
  - Receipt No.
  - Received From
  - Paid via
  - Amount Received
  - Payment Reference
  - Payment Note
- Updated Business Receipt PDF to show Received From and Paid via fields.

## Safety boundaries

- Did not modify New Oriental partner settlement logic.
- Did not modify parent invoice/receipt logic.
- Did not modify package balances, attendance, payroll, scheduling, or receipt approval flows.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
