# Teacher Sessions Historical Feedback Recovery

- Date: 2026-06-02
- Release: 2026-06-02-r173
- Area: Teacher Portal / My Sessions

## Problem

Teachers could miss older feedback tasks because `/teacher/sessions` only displayed the current timeline: roughly yesterday through the next 30 days. Ahmar's 2026-05-30 17:00-18:30 session with Chen Haoru still needed feedback on 2026-06-02, but it no longer appeared in My Sessions.

## Change

`app/teacher/sessions/page.tsx` now keeps the normal timeline and additionally includes recent historical sessions from the last 90 days when the assigned teacher has no feedback record or only a proxy draft. A small warning panel explains that past feedback tasks have been included.

## Guardrails

- Does not change teacher feedback submission API.
- Does not change attendance saves.
- Does not change scheduling, billing, payroll, package balance, or admin workflows.
- Keeps the existing teacher assignment permission rule.

## Verification

- Read-only Prisma query confirmed Ahmar's 2026-05-30 missing-feedback session is returned by the recovery condition.
- `npx tsc --noEmit --pretty false`
- `npm run build`
