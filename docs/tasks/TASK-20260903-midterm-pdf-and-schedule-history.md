# TASK-20260903-midterm-pdf-and-schedule-history

## Context

Jessika reported that the final text in Herman's Midterm Report was cut off in the `目标等级或分数` section. She also needs staff to trace material schedule changes without making the scheduling interface heavier or introducing a new workspace.

## Change

- Keep the existing one-page Midterm Report layout where the recommendation fields fit.
- Measure the recommendation fields before drawing them. When any one cannot fit at a readable size, keep the first-page summary clean and continue the full recommendation fields on a PDF continuation page.
- Reuse the existing `AuditLog` table for schedule history. Add one small, collapsed disclosure at the bottom of the existing class sessions page; no navigation or standalone history screen is added.
- Record successful web session creation, rescheduling, teacher replacement, student reassignment and removal with actor, timestamp and before/after snapshot.
- Record Mini Program student cancellation and session-location changes in the same history stream. The audit addition does not change cancellation charging or attendance behaviour.

## Non-goals

- No Midterm Report data rewrite, parent-message resend or change to Final Report layout.
- No schema migration, new database table, new sidebar item, new scheduling workbench or new staff workflow.
- No change to availability/conflict validation, attendance status, package balance, deduction, payroll, finance or permission rules.
- Do not claim to reconstruct historic changes that were never audited.

## Verification

- `npx tsx --test tests/midterm-pdf-and-schedule-history.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- After release, regenerate Herman's Midterm Report and render every PDF page for visual inspection; open one class sessions page and confirm the collapsed history starts closed and shows an existing or new scheduling record correctly.

## Risk

Low. The PDF continuation is a presentation-only path and does not alter report data. Schedule history writes happen in the same successful transaction as existing schedule mutations and are stored in the current AuditLog table. Older, unlogged events remain unavailable by design rather than being inferred.
