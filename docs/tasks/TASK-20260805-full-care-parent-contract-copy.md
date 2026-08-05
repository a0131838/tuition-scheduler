# TASK-20260805-full-care-parent-contract-copy

## Context

The corrected contract body used the Full Care price tier, but the sign-page summary still displayed the package's internal O Level course. Structured exclusions also appeared as internal IDs, and the acceptance statement referenced the retired tuition-addendum wording.

## Change

- Show the snapshot's Full Care tuition price tier in the parent summary.
- Keep the actual course summary only for tuition-only contracts.
- Translate all approved Full Care exclusion IDs into bilingual parent-readable boundaries.
- Update the electronic acceptance to the standalone Full Care Service Agreement.

## Non-goals

- No changes to contract amounts, package course data, invoice, receipt, payment or lesson balances.

## Verification

- Tests assert the conditional price-tier summary and standalone agreement acceptance.
- Tests assert that known exclusion IDs do not leak into parent labels.
- The focused Full Care suite and complete 240-page build pass.

## Risk

Low. The change is limited to parent-facing labels and contract snapshot preparation for unsigned contracts.
