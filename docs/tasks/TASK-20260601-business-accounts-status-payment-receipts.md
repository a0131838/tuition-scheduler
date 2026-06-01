# Business Accounts status, payment, and receipt workflow

- Date: 2026-06-01
- Release: 2026-06-01-r166
- Scope: Business Accounts finance workspace only.

## Request

Finance needs the new company billing function to support deletion/correction, company bank-transfer details, and a template that differs from existing parent invoice/receipt flows. The same structure should work for future companies with similar agreements.

## Implementation

- Expanded the AppSetting-backed Business Accounts model with:
  - reusable account types and agreement types
  - contact, agreement, payment terms, and bank-transfer instruction fields
  - monthly document status flow: draft, issued, paid, void
  - receipt metadata and payment recording fields
- Added account creation and account profile editing in `Finance -> Business Accounts`.
- Added monthly document actions:
  - issue draft
  - delete draft
  - void issued or paid document with reason
  - record payment and generate receipt number
- Updated Business Invoice PDF to include company-transfer payment instructions.
- Added Business Receipt PDF export for paid business invoices.

## Safety boundaries

- Did not modify New Oriental partner settlement.
- Did not modify parent invoice or parent receipt templates.
- Did not modify package balance, attendance, payroll, scheduling, or receipts approval logic.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Local sample PDF generation for invoice, service report, and receipt.
