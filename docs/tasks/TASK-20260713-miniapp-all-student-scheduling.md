# TASK-20260713 Miniapp All-Student Scheduling

## Goal

Make every student available from the staff-miniapp scheduling page. Keep the no-future-lesson package-ready calculation as an attention signal, not as a restriction on who can be scheduled.

## Rules

- `全部学生`: every Student record, searchable by name, school, or target school.
- `待排课关注`: usable active package and no future Session.
- `首次排课`: no historical or future Session.
- `待续排`: historical Session exists but no future Session.
- `已有未来课程`: at least one future Session; staff can still add lessons.
- `待处理前置条件`: no usable package, no configured subject, or finance gate not open.

## Workflow

- An existing open `排课要求 / 排课协调 / 新排课 / 补课加课` Ticket is reused.
- A student with a future lesson receives a new `补课加课` Ticket when needed.
- A student without a future lesson receives a new `新排课` Ticket when needed.
- Ticket creation is allowed even if package prerequisites are missing, so staff can coordinate and fix setup.
- Final Session preview/apply continues to enforce all existing package and scheduling rules.

## Permissions And Safety

- ADMIN can preview and apply real scheduling.
- CS or CS workspace can list students and create/reuse Tickets only.
- No migration and no attendance, package deduction, finance, receipt, payroll, or teacher-rate write.
- Existing future lessons are never changed merely by opening the page or creating a Ticket.

## Data Evidence

- Total students: 88.
- Attention: 25.
- First scheduling: 15.
- Renewal scheduling: 34.
- Already has future lessons: 39.
- Package/subject/finance ready: 46.
- Needs prerequisites: 42.
- Existing reusable scheduling Ticket: 4.
- Read-only evaluation made no data changes.

## Verification

- [x] 28 focused scheduling, conflict, route-guard, and notification tests.
- [x] TypeScript.
- [x] Miniapp JavaScript syntax and 22-page audit.
- [x] Read-only real-data reconciliation.
- [x] Full 187-page production build.
- [ ] Deploy and authenticated production checks.
- [ ] WeChat DevTools re-open/compile and phone regression.
