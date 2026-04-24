# TASK-20260424 Student Detail First Purchase CTA Top

## Goal

Move the `Start first purchase setup / 开始首购建档` card to the top of the student detail page content so ops can see it immediately.

## Problem

The CTA existed, but it appeared too far down the page:

- planning tools and enrollment sections came first
- ops had to scroll to discover the entry point

This made the first-purchase flow feel hidden even though the dedicated setup page already existed.

## Changes

- updated `app/admin/students/[id]/page.tsx`
  - extracted the existing first-purchase CTA card into a reusable block
  - rendered it at the top of the main student-detail content stack
  - removed the old lower-page copy so the CTA appears only once

## Validation

- `npm run build`
- visual code verification that the CTA now renders before summary cards and the sticky student workbench

## Risk

Low. This is a layout/discoverability change only.
