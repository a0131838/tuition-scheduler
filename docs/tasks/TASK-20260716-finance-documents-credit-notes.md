# TASK-20260716-finance-documents-credit-notes

## Context

Finance issued `RGT-CN-202607-0001` for SGD 270 against partner invoice `RGT-202606-0019`, but Finance Documents still listed only invoices and receipts and continued to show the invoice's SGD 18,540 original amount as the unpaid balance.

## Change

- Add `CREDIT_NOTE` as a Finance Documents type for issued and void partner Credit Notes.
- Keep the original invoice amount immutable and show issued credit, adjusted amount, approved receipts, and remaining balance separately.
- Count only `ISSUED` Credit Notes in adjusted balances; retain `VOID` notes as audit rows and exclude drafts.
- Add normal and sealed Credit Note PDF links, related-invoice search, source-workspace navigation, and the same fields to Excel export.
- Treat fully credited invoices as `Fully credited` and keep Credit Note rows out of payment-status queues.

## Non-goals

- Do not change Credit Note creation, editing, issue, void, numbering, PDF generation, or validation.
- Do not modify stored partner invoices, receipts, settlements, payment records, packages, attendance, payroll, or AppSetting billing JSON.
- Do not include draft Credit Notes in the formal Finance Documents center.

## Verification

- `npx tsx --test tests/finance-documents.test.ts tests/partner-credit-notes.test.ts` passed 9/9.
- `npx tsc --noEmit` passed.
- `npm run build` passed with 193 pages.
- Authenticated Finance Playwright check against production data showed `RGT-202606-0019` as SGD 18,540 original, SGD 270 issued credit, SGD 18,270 adjusted, SGD 0 received, and SGD 18,270 remaining.
- `RGT-CN-202607-0001` appeared as an ISSUED Credit Note linked to the original invoice with both PDF links.
- Filtered Excel export returned HTTP 200 and an XLSX payload; temporary authentication sessions were deleted.

## Risk

Low-to-medium and read-side only. The main risk is presenting an incorrect aggregate if a Credit Note status is mishandled, covered by focused tests and a real-data browser check. No business records are written by this feature.
