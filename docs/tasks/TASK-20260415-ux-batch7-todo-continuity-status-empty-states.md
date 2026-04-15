# TASK-20260415-ux-batch7-todo-continuity-status-empty-states

## 1) Request

- Request ID: `TASK-20260415-ux-batch7-todo-continuity-status-empty-states`
- Requested by: Zhao Hongwei
- Date: `2026-04-15`
- Original requirement: implement the five recommended mature-system UX improvements together: Todo Center return paths, student detail first-screen cleanup, status vocabulary cleanup, split-layout stability, and clearer empty/failure states.

## 2) Scope Control

- In scope:
  - Extend Todo Center links into attendance and ticket detail with source-return context.
  - Add visible return banners on downstream ticket and attendance pages opened from Todo Center.
  - Standardize existing approval/student/receipt/package source-return banners through one shared component.
  - Collapse lower-frequency student profile snapshot content so next actions stay first.
  - Improve Todo Center and Package Billing empty states with actionable guidance.
  - Stabilize expense split queue columns so detail panels do not stretch with long queues.
- Out of scope:
  - Changing approval rules, receipt math, package billing rules, ticket status permissions, attendance deductions, or scheduling candidate logic.
  - Rebuilding the admin UI or replacing the existing navigation system.
- Must keep unchanged:
  - Existing permissions, server actions, finance calculations, receipt approval flow, package data, ticket data, and attendance save behavior.

## 3) Findings (Read-only Phase)

- Root cause:
  - Workflow pages had gradually improved return paths, but Todo Center still opened high-frequency downstream pages without a visible “you came from here” context.
  - Several source-return banners duplicated layout code, making the same pattern look slightly different page to page.
  - Student detail still spent first-screen space on low-frequency profile confirmation before action guidance.
  - Some queue empty states said “none” without explaining whether the lane was clear, filtered, or should be followed by another action.
  - Expense split queues had fixed minimum column widths that could still make selected panels feel awkward in constrained windows.
- Affected modules:
  - Todo Center
  - ticket detail
  - session attendance
  - student detail
  - receipt approvals
  - expense claims
  - package billing
- Impact level: Medium UX impact, low business-rule risk.

## 4) Plan (Before Edit)

1. Add a reusable workflow source banner component for consistent source-return messaging.
2. Wire Todo Center links into attendance and ticket detail with `source=todo` and a safe `todoBack` return path.
3. Show Todo source banners on downstream attendance and ticket detail pages.
4. Collapse student profile snapshot and prioritize next actions.
5. Improve empty-state guidance and split-layout sizing without changing data logic.

## 5) Changes Made

- Files changed:
  - `app/admin/_components/WorkflowSourceBanner.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/sessions/[id]/attendance/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/tasks/TASK-20260415-ux-batch7-todo-continuity-status-empty-states.md`
- Logic changed:
  - Todo Center-generated ticket and attendance links now carry safe workflow-return params.
  - Ticket detail and attendance pages display a return banner when opened from Todo Center.
  - Existing source banners now use a shared component.
  - Todo ticket status text is more action-first in Todo Center.
  - Student detail collapses profile snapshot and keeps next actions first.
  - Package Billing invoice form layout is responsive, and empty invoice/receipt states are more instructive.
  - Expense split queues use zero-min grid columns to reduce detail panel stretching pressure.
- Logic explicitly not changed:
  - No approval, finance, attendance deduction, scheduling, package, or ticket-transition business rule was changed.

## 6) Verification

- Build: `npm run build` passed.
- Runtime: pending deploy verification.
- Key manual checks:
  - Todo Center links should include source-return params for attendance and ticket detail.
  - Attendance and ticket detail should show `From Todo Center / 来自待办中心` when opened from Todo.
  - Approval, receipt, package, and student workflow banners should remain visible with consistent layout.
  - Student detail first screen should prioritize next actions and keep profile snapshot folded.
  - Empty Todo and Package Billing states should explain what to do next.

## 7) Risks / Follow-up

- Known risks:
  - Low. The change is presentation/navigation oriented, but users may notice that ticket actions opened from Todo return directly to Todo after save.
  - Some older pages may still have custom source banners or raw empty states outside this batch.
- Follow-up tasks:
  - Continue the layout stability sweep for finance workbench and partner settlement if users report similar split-panel stretching there.
  - Consider a shared empty-state component if more pages adopt this pattern.

## 8) Release Record

- Release ID: `2026-04-15-r63`
- Deploy time: pending
- Rollback command/point: previous production commit before `2026-04-15-r63`
