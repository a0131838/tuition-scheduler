# TASK-20261007-teacher-availability-consistency

## Context
The user authorized the recommended Jasmine availability correction and server release. Read-only production checks found no date slots on October 16 and 19, but the scheduling validator treated a weekly template as confirmation. The monthly calendar showed no available date slots, causing contradictory instructions.

## Change
- Normal scheduling accepts only a confirmed date range, merging adjacent date ranges and respecting explicit unavailable intervals and approved leave. A weekly template alone supplies a pending-confirmation explanation.
- Keep strict super-admin exception permission. Candidate results show amber exception text and the underlying availability reason instead of a green Available badge.
- New independent TeacherAvailabilityBlock model, additive migration with interval check/unique index/foreign key. Monthly date-slot regeneration does not delete restrictions.
- Admin and teacher self-service web editors support full-day/partial restrictions, notes, audit logs, teacher-bound self access, read-only denial and optimistic removal. Warn about overlapping existing lesson records, without cancelling or modifying them.
- Shared effective-range subtraction across teacher calendar and staff Mini Program schedule calendar. Booking slots exclude restrictions and approved leave; booking teacher date candidates account for explicit restrictions.
- Use Singapore date/weekday boundaries in the shared validator and teacher month grid.

## Verification
- 33 tests: teacher scheduling availability, quick schedule batch, calendar, first scheduling, administrator date-slot validation and overlap rules.
- Isolated PostgreSQL migration and `scripts/qa/teacher-availability-consistency-uat.ts`: actual service save/delete, audit counts, observer denial, cross-teacher/stale removal denial, partial/full exceptions, booking and Mini Program free-time consistency, date regeneration, unchanged existing lesson, and original ledger/outbox/session checksum after fixture cleanup.
- `scripts/qa/teacher-availability-consistency-http-uat.ts` against local production build port 3151: authenticated API save/delete, observer/teacher admin-write denial, forced self teacher binding, stale removal, EN/ZH/BILINGUAL calendar/editor and teacher self editor.
- `npm run build`, release preflight and guarded deployment. Exact logs and production before/after read-only checks stored outside Git in `交付文件/20261007-老师可用时间一致性修复`.

## Operational guidance
Teachers → select teacher → Availability: record confirmed date slots, or save full-day/partial unavailable time. Teacher portal → Availability offers the same unavailable editor for the bound teacher. Confirm normal dates with the teacher before adding date slots. Existing courses need separate review if a new restriction overlaps them. Refresh an already open scheduling page before using its candidates; normal save/preview validates again on the server.

## Risk
Medium: normal scheduling intentionally stops relying on an unconfirmed weekly template. Empty historical dates remain pending; no automatic availability backfill or lesson cancellation. Super-admin exception authority remains, but is visibly flagged. Web editor changes are released with the server; the existing Mini Program scheduling APIs consume the common validation without a client package change. Rollback to r477 leaves the additive table intact, but old code would stop enforcing restrictions.
