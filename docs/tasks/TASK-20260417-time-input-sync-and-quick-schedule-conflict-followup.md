# TASK-20260417-time-input-sync-and-quick-schedule-conflict-followup

## Why

After the Coco + Jasmine scheduling investigation, the deeper risk was not a broad scheduling-rule regression. The real shared problems were narrower:

1. `BlurTimeInput` only read its initial time value on first render, so controlled callers could keep showing stale time selections after the parent state changed.
2. quick-schedule candidate snapshots and execution routes could surface room or teacher conflict copy before making it obvious that the student already had a session in that same slot, which made ops think the system was contradicting itself.

## Scope

- make `BlurTimeInput` resync its internal selected time whenever the external value/default changes
- add shared session-conflict helpers to recognize when a conflicting session already belongs to the scheduling student
- make student quick-schedule preview and execution paths prioritize `student already scheduled here` style feedback before room/teacher conflict copy
- keep teacher availability rules, room occupancy rules, package checks, duplicate uniqueness constraints, and scheduling write behavior unchanged

## Files

- `app/_components/BlurTimeInput.tsx`
- `app/admin/students/[id]/page.tsx`
- `app/api/admin/students/[id]/quick-appointment/route.ts`
- `app/api/admin/ops/execute/route.ts`
- `lib/session-conflict.ts`
- `tests/session-conflict.test.ts`
- `docs/tasks/TASK-20260417-time-input-sync-and-quick-schedule-conflict-followup.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npx tsx --test tests/session-conflict.test.ts tests/availability-conflict.test.ts tests/admin-teacher-availability.test.ts tests/quick-schedule-execution.test.ts`
- `npm run build`
- data check still confirms Coco + Jasmine `2026-04-27 17:30-19:00` already exists, so the clearer conflict reason now matches the real data instead of implying a new availability bug

## Risk

Low to medium. This touches shared quick-schedule conflict messaging and a shared time input component, so the blast radius is wider than a single page, but the change is still constrained to state synchronization and conflict explanation order. It does not alter teacher availability calculation, room conflict math, package deduction rules, or the final unique-session guard in the database.
