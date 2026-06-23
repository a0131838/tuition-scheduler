# TASK 2026-06-23 Manager Feedback Selected Session Defaults

## Problem

On Manager Quality Desk, clicking `Give feedback / 给反馈` from a Lead Desk session showed the selected session context in the green banner, but the feedback form dropdowns could still display the default teacher and `No specific session / 不关联具体课程`.

## Root Cause

The form relied on uncontrolled `defaultValue` fields. During same-page navigation, the browser/Next.js could preserve the old dropdown state. The selected teacher was also derived from the URL teacher parameter first, instead of using the selected session as the source of truth.

## Fix

The page now derives the selected teacher from the selected Lead Desk session first, then remounts the feedback form when the selected teacher/session changes.

## Files Changed

- `app/admin/manager/quality/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260623-manager-feedback-selected-session-defaults.md`

## Verification

- `npm run build`

## Risk

Low. The change affects only form defaults on Manager Quality Desk. It does not change feedback persistence, teacher acknowledgement, scheduling, attendance, billing, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.
