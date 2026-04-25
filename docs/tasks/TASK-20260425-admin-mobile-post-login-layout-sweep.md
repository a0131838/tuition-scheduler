# TASK-20260425 Admin Mobile Post Login Layout Sweep

## Goal

Check and improve global post-login admin pages on phone-width screens.

## Problem

Several logged-in admin pages used grid or flex containers whose children kept their content minimum width on mobile. This could create page-level horizontal scrolling even when the visible page looked mostly responsive. The teacher payroll page also had a two-column work area with fixed minimum columns that could not fit on a phone.

## Scope

- Add mobile-only guardrails for logged-in admin main content so common containers can shrink instead of forcing horizontal page scroll.
- Keep form controls inside the phone viewport.
- Let teacher payroll's work queue / selected payroll split collapse naturally to one column on phone screens.
- Do not change student, scheduling, finance, payroll, approval, or attachment data logic.

## Files

- `app/responsive-layout.css`
- `app/admin/reports/teacher-payroll/page.tsx`
- `docs/tasks/TASK-20260425-admin-mobile-post-login-layout-sweep.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- queried real admin, student, package, teacher, and ticket records for representative logged-in pages
- local Playwright mobile viewport `390x844`
- checked 17 logged-in admin routes for page-level horizontal overflow and oversized sticky/fixed panels
- verified the mobile nav menu opens without horizontal overflow
- `npm run build`
