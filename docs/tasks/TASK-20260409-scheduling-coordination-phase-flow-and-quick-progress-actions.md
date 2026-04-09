# TASK-20260409-scheduling-coordination-phase-flow-and-quick-progress-actions

## Goal

Make scheduling coordination easier for ops to work through by showing a derived coordination phase and by adding the smallest possible quick actions for the two most common follow-up decisions:

- slot options have already been sent to the parent
- the family now needs a teacher-side exception confirmation

## Scope

- derive a coordination phase from ticket status, parent-form submission state, and availability-match results
- show that phase on the admin ticket detail page
- show that phase on the student detail scheduling coordination card
- show that phase on `Todo Center` coordination rows
- add quick actions on the ticket page for:
  - `Mark options sent`
  - `Ask teacher exception`

## Non-Goals

- no new database tables or enum changes
- no changes to token generation or parent form storage
- no changes to `Quick Schedule`, `Session`, `Attendance`, package math, or finance flows
- no automatic scheduling

## Files

- `lib/scheduling-coordination.ts`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/admin/todos/page.tsx`

## Verification

- `npm run build`
- ticket detail page shows `Coordination phase / 协调阶段`
- matching availability path can be moved to `Waiting Parent` with one click
- no-match path can be moved to `Waiting Teacher` with one click
- student detail and Todo Center show the derived phase wording
