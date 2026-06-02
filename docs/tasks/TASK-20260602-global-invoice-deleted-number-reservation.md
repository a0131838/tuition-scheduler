# Global Invoice Deleted Number Reservation

Date: 2026-06-02

## Request

Keep invoice numbering unified across own students, partners, and Business Accounts. If an invoice or voided Business Account receipt/document is deleted, the invoice number should remain reserved and should not be reused.

## Scope

- Include deleted parent/student invoice history in the global next invoice number calculation.
- Include deleted partner invoice history in the global next invoice number calculation.
- Add deleted Business Account invoice history and include it in the same global calculation.
- Write Business Account deleted history when deleting a draft document or a voided receipt/document.
- Show Business Account deleted invoice history on the existing deleted invoice history page.

## Out of Scope

- No changes to attendance, scheduling, package balances, payroll, tutor payments, or receipt PDF templates.
- No physical deletion changes for parent/student or New Oriental partner receipts.

## Verification

- `npx tsx --test tests/billing-optimistic-lock.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`
