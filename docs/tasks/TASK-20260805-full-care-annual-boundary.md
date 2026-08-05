# TASK-20260805-full-care-annual-boundary

## Context

Production verification with 赵测试2 confirmed that an inclusive annual service period beginning 2026-08-05 should end 2027-08-04, not 2027-08-05.

## Change

- Centralised the annual care end-date calculation.
- Defined the end date as the day before the same calendar date next year.
- Reused the same rule in care-project creation and contract draft defaults.
- Added an exact Singapore-date regression test.

## Non-goals

- Existing signed contract snapshots and invoices are not changed.
- No finance, lesson, attendance or package ledger record is modified.

## Verification

- Focused date-boundary and Full Care tests passed.
- TypeScript validation passed.
- `npm run build` passed for all 240 application pages.

## Risk

Low. The change is limited to new project and unsigned-contract default dates.
