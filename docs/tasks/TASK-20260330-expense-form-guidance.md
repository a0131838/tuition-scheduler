# TASK-20260330-expense-form-guidance

- Date: `2026-03-30`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Add clearer bilingual pre-submit guidance and field-level helper text to the teacher expense-claim form so required inputs are easier to understand.

## Goal

Reduce “why didn’t it submit?” confusion by telling teachers exactly what must be filled in before they press submit.

## Scope

- `app/_components/ExpenseClaimForm.tsx`
- release documentation only

## Non-Goals

- no expense validation-rule changes
- no server action changes
- no duplicate-submit rule changes
- no approval or payment flow changes

## Implementation Notes

- Added a bilingual pre-submit checklist at the top of the form.
- Added clearer helper text for:
  - transport location
  - receipt / invoice upload
  - attachment description / purpose

## Validation

- `npm run build`

## Deploy Note

After deploy, verify on `/teacher/expense-claims` that the form clearly explains:

- which fields are required
- that transport claims need location
- that a receipt/payment file must be uploaded before submit
