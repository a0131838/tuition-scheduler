# Business Accounts Global Invoice and Receipt Template Alignment

Date: 2026-06-01

## Request

Business Accounts invoices should not use a separate company-only invoice number format. They should follow the same invoice number style used by student and New Oriental partner finance documents, and paid company invoices should produce receipts in the same receipt style.

## Scope

- Use the global `RGT-yyyymm-xxxx` invoice number sequence when creating new Business Accounts monthly documents.
- Include Business Accounts monthly documents when checking global invoice number availability.
- Change Business Accounts receipt numbers to `InvoiceNo-RC`.
- Rebuild Business Accounts invoice and receipt PDFs using the same orange finance document structure used by existing parent and partner invoice/receipt exports.
- Keep the existing Business Accounts service report PDF unchanged.

## Files

- `lib/global-invoice-sequence.ts`
- `lib/business-accounts.ts`
- `lib/business-account-pdf.ts`
- `app/admin/finance/business-accounts/page.tsx`

## Out of Scope

- No changes to existing parent invoice or receipt exports.
- No changes to New Oriental partner settlement exports.
- No changes to attendance, package balances, scheduling, payroll, or teacher payments.
- Historical Business Accounts documents with old `GTEI-...` numbers remain unchanged.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Generated local sample Business Accounts invoice, receipt, and service report PDFs.
- Extracted text from the local sample PDFs to confirm the invoice number, receipt number, GT Educational receiving account details, Shanghai Xin Zhuo Si name, and amount.
