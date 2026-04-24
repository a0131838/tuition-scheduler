# TASK-20260424 Package Contract Workspace Page

## Summary

Move the heavy direct-billing student-contract workflow out of the package billing page and into a dedicated package contract workspace page, while leaving a lighter summary and entry point inside billing.

## Scope

- add `/admin/packages/[id]/contract` as the dedicated contract workspace route
- keep contract actions there: parent info link, renewal contract creation, draft business fields, sign link preparation, replacement versions, old signed invoice cleanup, and void history
- replace the billing-page contract block with a smaller summary card and a clear link into the new contract workspace

## Files

- `app/admin/packages/[id]/billing/page.tsx`
- `app/admin/packages/[id]/contract/page.tsx`

## Risk

Low to medium. This changes where admins find contract actions, but does not change contract rules, invoice creation, signed PDFs, or partner exclusions.

## Verification

- `npm run build`
- confirm package billing now shows a compact contract summary and `Open contract workspace`
- confirm `/admin/packages/[id]/contract` contains the full contract workflow and history actions
