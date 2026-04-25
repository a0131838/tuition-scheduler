# TASK-20260425 Student Mobile Sticky Workbench Fix

## Goal

Stop the mobile student detail page from letting the large student workbench block stick over the page content.

## Problem

On narrow phone viewports, the student detail workbench can be around a full screen tall. The sticky guard only downgraded large sticky blocks when their width passed a desktop-oriented minimum of 520px, so the phone-width student workbench stayed sticky and could cover most of the page while staff scrolled.

## Scope

- Let the sticky guard treat phone-width full-row sticky panels as large panels that should be downgraded.
- Keep the generated shortcut row compact on phones by making it a single horizontal row.
- Give student detail primary action links explicit short labels for the generated shortcut row.
- Do not change student data, scheduling rules, package rules, or finance logic.

## Files

- `app/admin/_components/WorkbenchStickyGuardClient.tsx`
- `app/admin/students/[id]/page.tsx`
- `docs/tasks/TASK-20260425-student-mobile-sticky-workbench-fix.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- local Playwright mobile viewport `390x844` on real student `王艺晨`
- verify `#student-workbench-bar` is downgraded to `position: static`
- verify generated sticky shortcut row is `56px` high with horizontal overflow instead of a full-screen sticky panel
- verify scrolling leaves the large workbench behind and shows content below the compact row
