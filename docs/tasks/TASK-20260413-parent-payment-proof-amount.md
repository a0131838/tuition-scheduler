# TASK-20260413-parent-payment-proof-amount

## Goal

Add an optional amount field to parent payment-proof records so finance can compare the selected proof against invoice remaining balance and entered receipt amounts using real stored values.

## Scope

- Extend parent payment-proof storage to persist an optional amount value.
- Update payment-proof upload and replacement forms to collect that amount.
- Show proof amounts in payment-record tables, selectors, and finance hints where they help receipt creation.
- Extend receipt create warnings to compare entered amount against both invoice remaining balance and selected proof amount when available.

## Guardrails

- Keep the new proof amount optional for backward compatibility.
- Do not change parent receipt numbering rules.
- Do not change receipt remaining-balance caps or payment-record uniqueness.
- Do not change partner billing behavior.

## Verification

- `npm run build`
- new payment proofs can store an optional amount
- existing records without proof amounts continue to render safely
- receipt create form shows proof-amount comparison hints when a selected proof has an amount
