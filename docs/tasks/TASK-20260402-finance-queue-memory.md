# TASK-20260402 Finance Queue Memory

## Goal

Reduce repeated filter setup on the two highest-frequency finance workbench pages by remembering the operator’s last queue/dataset state and restoring it on first open when no explicit URL params are provided.

## Scope

- `app/admin/_components/RememberedWorkbenchQueryClient.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- release documentation updates for the same ship

## Changes

1. Shared remembered-query helper
- add a tiny client helper that persists normalized query state into both cookie and local storage
- clear the remembered state automatically when the current page falls back to default filters

2. Receipt approvals queue memory
- remember the last global queue context for:
  - `month`
  - `view`
  - `queueFilter`
  - `queueBucket`
- restore that context on first open when the user comes back without explicit queue params
- keep package workspace, selected receipt, and repair-flow params out of the remembered state

3. Expense claims filter memory
- remember the last finance dataset/filter context for:
  - `status`
  - `month`
  - `paymentBatchMonth`
  - `expenseType`
  - `currency`
  - `q`
  - `approvedUnpaidOnly`
  - `archived`
  - `attachmentIssueOnly`
- restore that context on first open when the user comes back without explicit filter params
- keep selected claim/group and repair-return params out of the remembered state

4. Resume hints
- show an explicit “resumed last queue/filter” hint on both pages
- provide a direct link back to the default queue/desk so operators can reset context in one click

## Non-goals

- no approval-order changes
- no receipt review behavior changes
- no expense approval or payout behavior changes
- no selected-item routing changes
- no attachment storage or repair-loop logic changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3315` confirmed:
  - receipts approvals restores `queueFilter=FILE_ISSUE&queueBucket=OPEN` from cookie when opened without URL params
  - expense claims restores `approvedUnpaidOnly=1&currency=SGD` from cookie when opened without URL params
  - both pages show an explicit resume hint plus a direct return-to-default link
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `0ff6b71` and `https://sgtmanage.com/admin/login` returned `200`
- logged-in live QA confirmed both finance pages restore the remembered cookie state on production when opened without explicit URL params

## Release notes

- Release ID: `2026-04-02-r12`
- Risk: low
- Rollback: revert this release if receipt approvals or expense claims starts reopening the wrong queue state, if explicit URL params stop taking precedence over remembered state, or if default queue access becomes harder to reach
