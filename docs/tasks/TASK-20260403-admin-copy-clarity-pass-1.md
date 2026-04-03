# TASK-20260403 Admin Copy Clarity Pass 1

## Goal

Make a first admin-side copy cleanup pass on high-frequency workbench pages so labels read more naturally in bilingual mode and mixed-language terms stop slowing users down.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- `app/admin/reports/partner-settlement/page.tsx`
- `app/admin/students/page.tsx`
- release documentation updates for the same ship

## Changes

1. Receipt-approval wording cleanup
- change `Proof / file issues` to `Proof or file issues`
- change `Open proof / file issues` to `Open proof or file issues`
- keep the same queue filter and review logic

2. Partner-settlement wording cleanup
- change invoice-related mixed-language labels into more natural bilingual copy:
  - `Grouped by invoice` -> `Grouped by invoice number`
  - `Invoice Lines` -> `Invoice line count`
  - `Invoiced` -> `Invoice created`
- update the revert error copy to say `已关联发票` instead of `已关联Invoice`
- keep settlement, invoice, and receipt workflow logic unchanged

3. Student-desk search hint cleanup
- change the student search placeholder to `Search name, school, notes, or ID`
- keep search behavior unchanged

## Non-goals

- no queue-filter logic changes
- no settlement or invoicing logic changes
- no student-search behavior changes
- no layout restructuring

## Validation

- `npm run build`
- targeted copy audit confirmed the updated wording in:
  - receipt-approval file-issue links
  - partner-settlement invoice grouping/status labels
  - student search placeholder

## Release notes

- Release ID: `2026-04-03-r03`
- Risk: low
- Rollback: revert this release if any admin labels become less clear, if queue-filter links stop matching the intended file-issue queue, or if partner settlement status wording becomes misleading for finance users
