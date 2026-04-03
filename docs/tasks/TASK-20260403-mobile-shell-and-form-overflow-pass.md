# TASK-20260403-mobile-shell-and-form-overflow-pass

## Goal

Fix the most noticeable mobile-width overflow and stacking issues on the teacher payroll / expense workbench flow and the admin receipt-approval flow so phone-sized layouts read clearly without horizontal drift.

## Scope

- `app/layout.tsx`
- `app/responsive-layout.css`
- `app/teacher/_components/TeacherWorkspaceHero.tsx`
- `app/teacher/payroll/page.tsx`
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Why

- Mobile QA showed small but real horizontal overflow in shared app-shell content areas.
- Teacher payroll still felt cramped on narrow screens because the filter bar and hero actions were not stacking cleanly.
- Admin receipt approvals had a true mobile blocker: the quick package selector and several finance form grids still used desktop-biased fixed column counts.

## Guardrails

- Do not change payroll calculations, payroll confirmation, receipt approval rules, payment-record logic, receipt creation logic, or any finance workflow semantics.
- Keep routes, params, action handlers, and remembered queue behavior unchanged.
- Limit changes to layout containment, responsive stacking, and mobile readability.

## Implementation Notes

1. Make shared app shell containers use border-box sizing so `width: 100%` controls do not drift past the viewport on mobile.
2. Give the shared teacher workbench hero a mobile-friendly action stack and smaller title sizing.
3. Convert the teacher payroll filter bar to the existing responsive stacked filter pattern.
4. Replace fixed 2/3/4-column finance form grids in receipt approvals with auto-fit responsive grids and make the package selector width-safe on mobile.

## Verification

- `npm run build`
- local mobile-width QA on `http://127.0.0.1:3330/teacher/payroll`
- local mobile-width QA on `http://127.0.0.1:3330/teacher/expense-claims`
- local mobile-width QA on `http://127.0.0.1:3330/admin/receipts-approvals`
- confirm `document.documentElement.scrollWidth === document.documentElement.clientWidth` on the tested pages

## Release

- Release ID: `2026-04-03-r12`
- Status: `LIVE`
