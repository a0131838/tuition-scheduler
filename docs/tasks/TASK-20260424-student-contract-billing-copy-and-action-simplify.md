# TASK-20260424 Student Contract Billing Copy And Action Simplify

## Summary

Simplify the package-billing contract workspace so ops no longer see duplicated bilingual labels in the signed-result card and no longer need a separate "save draft" then "generate/refresh sign link" sequence just to prepare the latest signing link.

## Scope

- merge contract business-draft saving and sign-link preparation into one main server action
- remove the separate refresh-sign-link action from the billing workspace
- update the contract draft helper copy so it matches the new single-step workflow
- compress the signed-result summary so invoice, invoice-gate, and approval labels are not duplicated bilingually

## Files

- `app/admin/packages/[id]/billing/page.tsx`

## Risk

Low. This is a workflow and copy simplification inside the contract section of package billing. It does not change contract state rules, invoice generation, signed PDF output, partner exclusions, or package balances.

## Verification

- `npm run build`
- verify saving lesson hours / fee / bill-to / agreement date now also prepares the latest sign link in one submit
- verify `READY_TO_SIGN` contracts now show one "save and refresh sign link" action instead of separate save + refresh buttons
- verify the signed-result card no longer repeats invoice and approval labels twice
- release-doc bundle finalized together with changelog and release board updates
