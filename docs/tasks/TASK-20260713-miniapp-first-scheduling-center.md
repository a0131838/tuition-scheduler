# TASK-20260713 Miniapp First Scheduling Center

## Goal

Let academic operations find and schedule a new student's first lesson from the staff miniapp without requiring an existing Session, while also identifying active students who need renewal scheduling.

## Product Flow

1. Staff home shows `待排课学生` for ADMIN, CS, and CS-workspace users.
2. The list includes students who have a usable active package and no future Session.
3. Rows distinguish `首次排课` from `待续排` using historical lesson evidence.
4. Search and filters cover all, first, renewal, ready, and blocked students.
5. Existing open `排课要求 / 排课协调 / 新排课 / 补课加课` tickets are reused.
6. If no suitable ticket exists, the system creates one internal `新排课` Ticket with owner Jasmine and an AuditLog.
7. ADMIN chooses course subject, level, qualified teacher, campus, room, date, time, duration, and 1-12 weekly lessons.
8. Preview checks every week. Apply requires the signed preview and second confirmation, creates/reuses the one-to-one group and Class, upserts Enrollment, creates Sessions, completes the Ticket, disables its availability link, and records audits atomically.
9. The new Sessions automatically appear in the assigned teacher's schedule and the parent's schedule, and remain eligible for the existing course-reminder cron.

## Permissions

- `ADMIN`: list, create/reuse Ticket, preview, and apply scheduling.
- `CS` or CS workspace: list and create/reuse Ticket only.
- `TEACHER`, `FINANCE`, and `SALES`: no first-scheduling center unless they separately hold active CS workspace access; never receive scheduling-write permission.
- Parent request types remain unchanged. Staff-assisted requests additionally support `新排课` and `补课加课`.

## Safety Boundaries

- No migration.
- No attendance, package deduction, invoice, receipt, payroll, or teacher-rate write.
- Package finance gate and balance remain checked for every proposed lesson date.
- Teacher qualification and availability, student/teacher/appointment/room conflicts, duplicate Session protection, future-time rules, and transaction isolation remain mandatory.
- The list is read-only until a staff member explicitly opens or creates a Ticket.
- A student who gains a future Session during a race can no longer create a fresh first-scheduling Ticket.

## Data Evidence

Read-only evaluation on 2026-07-13 found:

- 25 students with usable active packages and no future lesson.
- 5 true first-scheduling students.
- 20 renewal-scheduling students.
- 24 ready for scheduling.
- 1 blocked by a visible package/course prerequisite.
- No data was created or changed by this evaluation.

## Verification

- [x] 27 focused scheduling/auth/notification regression tests.
- [x] TypeScript.
- [x] Miniapp JavaScript syntax.
- [x] Miniapp release audit: 22 pages, zero errors.
- [x] Read-only real-data candidate reconciliation.
- [x] Full production build: 187 pages.
- [ ] Release-doc gate.
- [ ] Production deploy and authenticated read-only API verification.
- [ ] WeChat DevTools re-open, compile, and phone regression.
