# TASK-20260713 Miniapp Teacher Mobile Workbench

## Goal

Give linked TEACHER users a practical native-miniapp workbench for their highest-frequency mobile tasks without exposing management, finance approval, payroll, or other teachers' data.

## Included

- Keep own daily schedule, attendance, feedback, and future-course reschedule requests.
- Add own next-30-day availability list/create/delete using TeacherAvailabilityDate.
- Add a dedicated future-course leave/reschedule entry that continues into the existing Ticket workflow.
- Add own expense submission with receipt/invoice upload and personal status history.
- Add monthly completed-session count, duration, attendance, and feedback history without pay amounts.
- Split the staff home so teacher accounts do not load or display parent-request, proxy-entry, all-student scheduling, or management-coordination cards.

## Permissions And Safety

- All new APIs require role TEACHER and a linked teacherId.
- Availability is limited to the current teacher, next 30 days, 08:00-22:50, with overlap/duplicate protection.
- Deleting availability does not delete or change an existing Session.
- Leave/reschedule remains a Ticket; Jasmine/Eva performs any real timetable change.
- Expense submission reuses existing types, currency normalization, 10MB file validation, duplicate guard, audit log, approval, and payment flow.
- Expense attachment is deleted if claim creation fails.
- History is read-only and excludes payroll, hourly rates, and other teachers.
- No schema migration or change to scheduling, deduction, package, payroll, teacher rate, expense approval, or payment rules.

## Real Data Evidence

- Teacher records: 48.
- TEACHER users: 50.
- Linked TEACHER users eligible for miniapp: 46.
- Active teacher miniapp bindings: 0.
- Future 30-day teacher Sessions: 179.
- Current-month completed teacher Sessions: 107.
- Future availability slots: 664.
- Existing teacher expense status data is readable through the same ExpenseClaim records.

## Verification

- [x] 28 focused teacher/scheduling/conflict/auth/notification tests.
- [x] TypeScript.
- [x] Miniapp JavaScript syntax and 26-page release audit.
- [x] Read-only real-data reconciliation.
- [x] Full 191-page production build.
- [ ] Deploy and production permission-boundary checks.
- [ ] Bind one test teacher and complete real-phone read/write regression.
