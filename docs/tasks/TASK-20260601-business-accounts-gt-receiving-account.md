# Business Accounts GT receiving account clarification

- Date: 2026-06-01
- Release: 2026-06-01-r168
- Scope: Business Accounts workspace and PDFs only.

## Request

Clarify that the remittance/payment information on Business Accounts is GT Educational's receiving account. Other companies, such as Shanghai Xin Zhuo Si, pay GT Educational. The fields should not look like the customer's own bank account.

## Implementation

- Updated Business Accounts labels to say:
  - Our receiving account for company transfers
  - Payee name (our company)
  - Receiving bank
  - Receiving account no.
- Defaulted Business Accounts remittance details to the same GT Educational / OCBC information used by existing parent and New Oriental/partner invoice PDFs:
  - Account name: GT Educational Institute Pte. Ltd.
  - Bank: OCBC Bank Singapore
  - Bank address: 65 Chulia Street #01-40 OCBC Centre Singapore, S049513
  - Account number: 595214891001
  - Swift code: OCBCSGSG
  - Currency: SGD
- Added receiving bank address support in Business Accounts and Business Invoice PDF.

## Safety boundaries

- Did not change existing parent invoice/receipt templates.
- Did not change New Oriental partner settlement or partner invoice/receipt templates.
- Did not change package balances, attendance, payroll, scheduling, or receipt approvals.

## Verification

- Confirmed current parent and partner invoice export routes use the same GT Educational / OCBC remittance details.
- `npx tsc --noEmit --pretty false`
- `npm run build`
