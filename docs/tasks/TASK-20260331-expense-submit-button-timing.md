# TASK-20260331-expense-submit-button-timing

- Date: `2026-03-31`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Hotfix the expense submit button timing so browsers can dispatch the native form submit before the button locks itself into the pending state.

## Goal

Stop teacher/admin expense claim forms from showing `Submitting...` without any network request reaching the server.

## Scope

- `app/_components/ExpenseClaimSubmitButton.tsx`
- release documentation only

## Non-Goals

- no expense validation-rule changes
- no duplicate-submit rule changes
- no expense storage-path changes
- no approval, payment, or archive flow changes

## Implementation Notes

- The button still runs `reportValidity()` before entering pending mode.
- The pending-state flip is delayed by one event-loop tick with `window.setTimeout(..., 0)` so the browser can start the native multipart submit first.
- This preserves the existing UX while avoiding browsers that cancel submit when the clicked button becomes disabled too early.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify that:

- a teacher can submit a new expense claim from a fresh page load
- the button still shows `Submitting... / 提交中...` during a valid submit
- invalid forms still stay on page and show normal browser validation prompts
