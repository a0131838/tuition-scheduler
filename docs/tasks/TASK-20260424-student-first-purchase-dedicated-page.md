# TASK-20260424-student-first-purchase-dedicated-page

## Summary

Move the embedded "first purchase setup" form out of the student detail page and into a dedicated page so the workflow is easier to find, less repetitive, and more focused.

## Scope

- add a dedicated first-purchase page at `app/admin/students/[id]/first-purchase/page.tsx`
- replace the large inline form on the student detail page with a prominent CTA card
- keep the student detail page lightweight while preserving the intake summary and next-step context
- redirect successful first-purchase creation straight into the package contract workspace

## Files

- `app/admin/students/[id]/page.tsx`
- `app/admin/students/[id]/first-purchase/page.tsx`

## Risk

- low
- student detail UI refactor plus one new admin route
- no changes to contract signing rules, invoice creation rules, or package balances

## Verification

- `npm run build`
- verify student detail no longer embeds the full first-purchase form
- verify the new `Start first purchase setup / 开始首购建档` CTA opens the dedicated page
- verify submitting the dedicated page creates the package/contract and redirects to `/admin/packages/[id]/contract`
