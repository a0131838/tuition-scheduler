# TASK-20260414-ux-batch1-dashboard-approvals-students

## Why

The 2026-04-14 UX review found that the system is already functionally mature, but high-frequency users still lose time because key pages make them read too much before acting, scan oversized cards, and misread narrowed datasets as if they were the full list.

## Scope

- tighten the admin dashboard first screen so it behaves more like a daily operations router
- make approval inbox denser and more action-oriented for scan-and-clear work
- make the student list’s current data scope and restored-filter state explicit
- add a written UX review doc so later batches can continue from the same diagnosis

## In Scope Details

- dashboard:
  - shorter hero copy
  - compact operational metrics
  - stronger emphasis on immediate work
- approval inbox:
  - filter counts on chips
  - current scope summary
  - denser row-style review layout
  - better empty-state next actions
- students:
  - first-screen scope banner
  - stronger restored-filter warning
  - one-click path back to the full list

## Out of Scope

- changing approval rules
- changing receipt queue business logic
- changing expense-claim approval config behavior
- redesigning the full navigation system
- reworking scheduling coordination in this batch

## Acceptance

- admin home should feel tighter and more task-first on the first screen
- approval inbox should be easier to scan for lane, amount, urgency, and risk
- users should be much less likely to confuse a narrowed student dataset with the full list
- the UX review doc should exist in `docs/` for follow-up batches
