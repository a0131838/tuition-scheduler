# TASK-20260711 Miniapp Scheduling Board Scope

## Problem

The web Ticket Center contains multiple scheduling-related Ticket types, but the new mobile board only queried the exact `排课协调` type. Production therefore showed one Ticket on mobile while the web interface showed many scheduling Tickets.

## Production Reconciliation

- Total Tickets: 428.
- Archived Tickets: 414.
- Open scheduling-related Tickets: 13.
- `临时取消&请假课程`: 5.
- `改上课老师`: 2.
- `改课程时间`: 2.
- `补课加课`: 2.
- `新排课`: 1.
- `排课协调`: 1.

## Scope

- Include all six scheduling-related Ticket types in the mobile board and detail access.
- Keep original Ticket types unchanged.
- Display the original type on board cards and detail headers.
- Rename the mobile entry to `排课与调课`.

## Exclusions

- Do not show archived, completed, cancelled, or unrelated Tickets.
- Do not change permissions, status transitions, Ticket completion, or Session writes.

## Verification

- Authenticated board API returns 13 open production Tickets.
- Per-type totals match the direct database query.
- TypeScript, miniapp syntax/JSON, and full build pass.
