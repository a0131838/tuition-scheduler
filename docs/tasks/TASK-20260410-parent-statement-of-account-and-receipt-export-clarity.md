# TASK-20260410 Parent Statement Of Account And Receipt Export Clarity

## Why

Finance needed two things without disturbing existing billing controls:

1. a clear explanation for why some receipt PDFs cannot be exported yet
2. a separate Statement of Account PDF that shows package-level invoice transactions, approved paid amounts, and the remaining balance owing

## Scope

- add a new read-only parent package Statement of Account PDF export
- expose the export link from the finance invoice workbench and package billing page
- replace vague `Pending approval` receipt copy with more explicit finance-facing wording

## Guardrails

- do not change invoice creation behavior
- do not change receipt approval rules
- do not change deduction, package balance, or settlement logic
- only count approved receipts inside the formal paid total on the statement PDF

## Verification

- `npm run build`
- open a package billing page and confirm the new Statement of Account PDF link is present
- open the finance invoice page with a selected package and confirm the same export link is present
- confirm receipt actions still require full approval before formal receipt PDF export
