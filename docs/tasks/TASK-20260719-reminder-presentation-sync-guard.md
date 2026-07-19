# TASK-20260719-reminder-presentation-sync-guard

## Context

The first production sync after r272 added a teacher web URL as a new presentation line. The previous presentation-only comparison ignored only the first line, so one completed reminder was treated as a course change. The correction insert failed because the non-database control flag was spread into Prisma data; no false correction task was created, but the existing Teng W. W. reminder received a `supersededAt` timestamp before the failed insert.

## Change

- Compare the actual time-prefixed course lines when deciding whether reminder changes are presentation-only.
- Keep internal control fields out of every Prisma create/upsert payload.
- Add regression coverage proving a new portal URL does not change the semantic course lines, while an actual time change does.
- After deployment, clear the single accidental `supersededAt` value only if the exact task still has no correction child, then rerun the standard communication sync.

## Non-goals

- No valid correction task is removed or suppressed.
- No Session, reminder recipient, reminder time, attendance, package, finance or payroll data changes.

## Verification

- Thirteen focused communication tests passed.
- All 222 repository tests and the 208-route production build passed.
- TypeScript passed.
- Production repair is scoped to task `8afb9939-a85e-49f2-932d-febf7cad25a0` and requires the no-correction precondition.

## Risk

Low after the guard. The production cron will continue failing until this roll-forward deploy completes, so release is urgent and must be followed by exact task repair plus a successful sync.

## Rollback

Rollback application code to `921f2f5913ced880a734cfd5ee97228e851b6988` only if the roll-forward fails; r272 presentation would also be removed.
