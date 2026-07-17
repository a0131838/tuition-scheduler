# TASK-20260717 Miniapp Calendar Ticket Queue

Release candidate: `2026-07-17-r260`

## Objective

Bring the existing scheduling Ticket queue into Eva and Jasmine's native-miniapp calendar workspace so lessons and unfinished scheduling work can be reviewed from one mobile screen.

## Scope

- Add a collapsible `待排课工单` section to the existing month/week/day staff calendar.
- Show exact open and overdue totals from the existing miniapp scheduling-coordination API.
- Reuse the existing status, overdue, owner and student/course/ticket-number filters.
- Keep calendar student search and Ticket search independent, with separate debounce and stale-response protection.
- Deep-link each Ticket to the existing miniapp coordination detail and guarded scheduling panel.
- Label `新排课`, `补课加课`, `排课协调` and `排课要求` as able to open the existing new-session panel.
- Label time-change, teacher-change and leave/cancellation Tickets as `待关联原课程`; phase one does not execute those actions from the calendar.
- Refresh the calendar and Ticket queue after returning from a Ticket detail.

## Web And Data Boundaries

- No `app/admin/**` page, web component or web Ticket workflow is changed.
- No API, database model or migration is added.
- The calendar workspace adds only GET reads and navigation; it has no POST, PATCH or DELETE path.
- Existing Session creation remains ADMIN-only and continues through the current signed preview, package/finance gate, teacher qualification, availability, conflict recheck and explicit confirmation flow.
- Attendance, package balance, finance, payroll, settlement and notification behavior are unchanged.

## Verification

- [x] All native-miniapp JavaScript syntax checks.
- [x] Focused calendar workbench tests: `5/5`.
- [x] Complete miniapp and WeChat subscription tests: `41/41`.
- [x] Backend tests: `79/79`.
- [x] Miniapp release audit: 30 pages, zero errors.
- [x] TypeScript.
- [x] Full production build: 194 pages.
- [x] `git diff --check` and explicit no-`app/admin/**` diff check.
- [ ] WeChat Developer Tools compilation and physical-phone touch/visual acceptance after the next experience-version upload.

## Risk

Low-to-medium native-miniapp presentation and read-orchestration change. The main remaining risk is long Ticket lists and physical-device layout variance. Formal scheduling writes remain in the existing guarded detail workflow.

