# TASK-20260424 Finance Document Center Nav And Allowlist

## Goal

Make the already-shipped finance document center pages actually reachable for finance users by:

- adding both pages to the finance-role allowlist in the admin layout
- surfacing both pages in the finance sidebar navigation

## Problem

The routes existed and rendered correctly:

- `/admin/finance/documents`
- `/admin/finance/deleted-invoices`

But finance users could still experience them as "打不开" because:

1. the finance-role allowlist in `app/admin/layout.tsx` did not include the two paths
2. the finance sidebar had no direct entries for the two pages

## Changes

- updated `app/admin/layout.tsx`
  - added `/admin/finance/documents` to `financeAllowedPath`
  - added `/admin/finance/deleted-invoices` to `financeAllowedPath`
  - added `Invoices & Receipts / 完整发票与收据` to finance navigation
  - added `Deleted Draft History / 已删除草稿历史` to finance navigation

## Validation

- `npm run build`
- manual code verification of `financeAllowedPath`
- manual code verification that both pages now appear in finance navigation groups

## Risk

Low. This is a navigation and access-allowlist follow-up for already-deployed pages. No data model or billing behavior changed.
