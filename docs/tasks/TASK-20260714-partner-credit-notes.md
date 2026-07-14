# TASK-20260714-partner-credit-notes

## Context

Finance needs a formal Credit Note for partner invoices when an issued source document is later corrected. The current partner-billing store can issue invoices and receipts but has no independent reduction transaction, tracking number or audit document.

The first confirmed case is New Oriental invoice `RGT-202606-0019`: the original system amount is SGD 18,540 and the corrected source total is SGD 18,270, requiring a partial Credit Note of SGD 270 against the April line.

## Change

- Add isolated `CreditNote` and `CreditNoteLine` tables.
- Generate independent numbers in the form `RGT-CN-YYYYMM-####`.
- Store the original invoice identity, totals and full JSON snapshot on each note.
- Allow Finance/Superadmin to create and edit drafts, issue with explicit confirmation, or void with a reason.
- Validate every credited line and reject duplicate, unknown or over-credit amounts inside serializable transactions.
- Show original total, issued credits and adjusted net in Partner Billing.
- Generate a bilingual Credit Note PDF linked to the original invoice.
- Block deletion of an original invoice after any Credit Note history exists.

## Non-goals

- Do not edit or replace the original invoice.
- Do not automatically change, delete or recreate an existing receipt.
- Do not change partner settlements, payment records, student billing, packages, lessons, attendance, payroll or contracts.
- Do not deploy or apply the migration until separately approved.

## Verification

- `npx prisma validate`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run test:backend` with 66 passing tests
- `npm run build` with 193 generated pages
- `git diff --check`
- Migration-safety test confirms no protected table is altered or updated.
- Business tests cover the SGD 270 New Oriental correction, line-level cumulative limits, invalid GST, unknown lines and issued-only net summaries.

## Risk

Medium but isolated to partner billing. The migration is additive. Draft and void notes do not affect adjusted totals. Existing receipts remain visible and unchanged so Finance can decide the accounting follow-up explicitly. Production has not been modified.

## PDF Header Follow-up

During Finance SOP capture, a deliberately long demo Credit Note number exposed that the PDF header value could wrap into the original-invoice row. Release `2026-07-14-r251` fits header values to a single line with a bounded minimum font size. This changes only the new Credit Note PDF header and does not change numbers, amounts, status, permissions, invoices, receipts or settlements.

Production verification passed at runtime commit `a24d06d`: a longer-than-production demo number stayed on one line, the original-invoice row remained separate, and the temporary Credit Note, line and authentication session were deleted with zero residue.
