# TASK-20260402 Admin Workbench UX Rollout

## Goal

Reduce first-screen density and improve task orientation across the admin workspace without changing routes, permissions, or business logic.

## Scope

- `app/admin/AdminSidebarNavClient.tsx`
- `app/admin/_components/workbenchStyles.ts`
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/todos/page.tsx`
- `app/admin/students/page.tsx`
- `app/admin/students/AdminStudentsClient.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `app/admin/expense-claims/page.tsx`
- `app/admin/packages/page.tsx`
- `app/admin/feedbacks/page.tsx`
- release documentation updates for the same ship

## Changes

1. Admin shell and navigation
- replace the flat, always-dense sidebar with grouped admin work areas
- add collapsible task-oriented navigation groups
- add a shared workbench visual language for admin heroes, metric cards, and filter panels

2. Admin homepage and todo center
- turn the admin homepage into a daily workbench instead of a setup-first landing page
- move lower-frequency setup guidance behind a disclosure
- make the todo center lead with today's priority work and push supporting views lower

3. High-frequency admin pages
- refactor students list, student detail, receipt approvals, expense claims, packages, and feedbacks into a more consistent queue/workbench structure
- surface current work context, next actions, and summary counts before long forms or tables
- reduce bilingual-mode density by collapsing lower-priority filters and supporting sections

## Non-goals

- no admin route changes
- no admin/finance permission changes
- no approval-order changes
- no attendance, billing, package, payroll, expense-claim, feedback, or student business-logic changes

## Validation

- `npm run build`
- manually verify:
  - admin sidebar groups collapse and the active workspace stays easy to find
  - admin homepage now opens as a task-first workbench
  - todo center leads with today's action items before supporting sections
  - students, packages, receipts, expense claims, and feedback pages keep their original data/actions while using the new workbench framing

## Release notes

- Release ID: `2026-04-02-r03`
- Risk: medium-low
- Rollback: revert this release if admin operators report that key navigation items or high-frequency actions became harder to find
