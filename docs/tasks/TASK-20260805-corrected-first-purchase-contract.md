# TASK-20260805-corrected-first-purchase-contract

## Context

After the incorrect signed Full Care contract was voided and its unreceipted invoice removed, the workspace exposed only a renewal action. Signing a renewal would create an additional purchase transaction and incorrectly add 12,000 lesson minutes to the existing test package.

## Change

- When no active contract exists but archived VOID history does, show a corrected-contract action.
- Preserve the archived contract's original flow type and contract mode.
- Reuse the existing replacement source so parent information and editable business details are available without rewriting signed history.

## Non-goals

- No renewal top-up for a first-purchase contract correction.
- No package, invoice, receipt, payment, attendance, payroll or scheduling logic changes.

## Verification

- Static workflow tests confirm the archived contract ID and original flow type are submitted.
- The focused contract/pricing/deletion suite passes.
- The complete 240-page production build passes.

## Risk

Low. This exposes an already supported replacement operation only when archived VOID history exists and keeps the original flow type intact.
