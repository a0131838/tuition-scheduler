# TASK-20260330-expense-submit-validation-hotfix

- Date: `2026-03-30`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Hotfix the teacher expense-claim submit button so browser-side required-field validation does not leave the UI stuck on a fake submitting state.

## Goal

Make expense claim submission feel trustworthy again when required fields or files are missing.

## Scope

- `app/_components/ExpenseClaimSubmitButton.tsx`
- release documentation only

## Non-Goals

- no expense claim validation-rule changes
- no server action changes
- no duplicate-submit rule changes
- no approval or payment flow changes

## Implementation Notes

- Keep the duplicate-submit lock behavior.
- Only flip the button into `Submitting... / 提交中...` after `form.reportValidity()` passes.
- If the browser blocks submit because a required field or attachment is missing, keep the button interactive and let the browser show its normal validation prompt.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify on `/teacher/expense-claims` that:

- clicking submit with a missing required field does not leave the button stuck on `Submitting...`
- the button still locks once a valid submit actually starts
