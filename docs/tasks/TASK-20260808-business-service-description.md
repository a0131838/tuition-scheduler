# TASK-20260808-business-service-description

## Context

Business-account service details were stored only in the internal monthly report, while invoice and receipt PDFs always displayed a generic corporate-service description. Custom one-time services therefore could not produce a self-contained invoice, and CRLF text could render as square glyphs in the supporting PDF.

## Change

- Added a dedicated invoice description plus structured service reference, date, period and location fields.
- Added an audited draft-only edit path that keeps the existing document ID and invoice number.
- Added account-type-aware PDF presentation: custom invoices use an internal Service Delivery Record, while recurring accounts keep the Monthly Service Report.
- Reused the invoice description on both invoice and receipt PDFs.
- Normalized multiline text and collapsed duplicate recipient names.
- Required finance to confirm both PDF previews before issuing a draft.

## Non-goals

- No issued, paid or void business document is rewritten.
- No existing invoice number, amount, payment record or receipt is changed.
- No parent billing, partner settlement, transport billing, package, attendance, scheduling or database schema logic is changed.
- Service delivery records remain internal and are not automatically sent to customers.

## Verification

- `npx tsx --test tests/billing-optimistic-lock.test.ts`
- `npx tsc --noEmit`
- `npm run test:backend`
- `npm run build`
- Rendered the JCI invoice and custom service-delivery record to PNG for visual inspection.

## Risk

Low. The change is confined to business-account draft content and PDF presentation, preserves legacy fallbacks, and rejects edits after issue.
