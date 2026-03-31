# TASK-20260331-yunfeng-availability-visibility-fix

## Goal

Fix the teacher-facing confusion where Yunfeng could only see sessions through April 14 and availability appeared shifted/changed across days.

## Root Cause

1. `app/teacher/sessions/page.tsx` only queried from recent history through the next 14 days.
2. Teacher/admin availability date-only flows mixed local `Date` construction with business-timezone formatting, which could make saved day slots appear on the wrong day in the UI.

## Scope

- Extend teacher session timeline to 30 days.
- Normalize teacher/admin availability date parsing and rendering to business timezone.
- Keep scheduling rules, durations, and overlap protection unchanged.

## Files

- `app/teacher/sessions/page.tsx`
- `app/teacher/availability/page.tsx`
- `app/api/teacher/availability/_lib.ts`
- `app/api/teacher/availability/slots/route.ts`
- `app/api/teacher/availability/clear-day/route.ts`
- `app/api/admin/teachers/[id]/availability/route.ts`
- `app/api/admin/teachers/[id]/availability/date/route.ts`
- `app/api/admin/teachers/[id]/availability/generate-month/route.ts`
- `app/admin/teachers/[id]/calendar/page.tsx`

## Verification

- `npm run build`
- production probe confirmed Yunfeng still had April sessions and date-availability rows; issue reproduced as display-layer mismatch, not data loss

## Status

Ready for deploy.
