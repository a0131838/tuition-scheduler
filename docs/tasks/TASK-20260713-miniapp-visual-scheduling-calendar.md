# TASK-20260713 Miniapp Visual Scheduling Calendar

## Goal

Give Eva, Jasmine, and linked teachers a practical visual scheduling calendar in the native miniapp while keeping every formal scheduling write inside the existing preview, permission, package, availability, and conflict controls.

## Completed

- Replaced the staff single-day list with month, week, and day modes.
- Added a 42-day calendar API with teacher, campus, course, and student filters.
- Added daily lesson, student, teacher, conflict, and pending-coordination summaries.
- Added teacher free-slot calculation by subtracting scheduled lessons from date-specific availability.
- Added teacher, room, and student overlap indicators for operational attention; these indicators do not silently change lessons.
- Kept lesson taps connected to the existing staff lesson detail and all existing reschedule, teacher, location, leave, cancellation, attendance, and feedback actions.
- Connected calendar dates and free-slot times to the existing all-student scheduling flow and prefilled the final new-session form.
- Preserved stale-request protection and added a 400ms debounce for student filtering.
- Added release-audit coverage and pure tests for overlap detection and free-slot subtraction.

## Permissions

- `ADMIN`: view all schedules, filter, open lesson management, and enter formal scheduling.
- `CS` or staff with the CS workspace: view the calendar, filter, and create/reuse a scheduling coordination Ticket; no Session write permission.
- `TEACHER`: view only the linked teacher's lessons and continue to teacher-owned attendance, feedback, and leave/request actions; no direct scheduling write.
- Finance, sales, and unrelated roles: no access to the visual scheduling calendar.

## Safety Boundaries

- No database migration or scheduling table mutation was added.
- New-session and lesson-change writes still require `ADMIN`, signed preview, immediate revalidation, and explicit confirmation.
- Course-package balance, finance gate, teacher qualification, date availability, student/teacher/room conflict, duplicate lesson, attendance deduction, payroll, and notification behavior remain owned by their existing services.
- Shared package access does not merge students' schedules; visible students continue to use the explicit capacity-one Session ownership rule.

## Verification

- [x] 42-day real-data read: 245 lessons, 49 teachers, 4 campuses, and 17 courses.
- [x] Real-data teacher filter: Yunfeng returned 60 lessons and 124 free slots.
- [x] Real-data operational scan identified 2 overlapping lessons and 4 dated coordination items without modifying any record.
- [x] 49 existing backend tests and 4 new calendar tests.
- [x] TypeScript and native-miniapp JavaScript syntax checks.
- [x] 26-page miniapp release audit.
- [x] Full 193-page production build.
- [ ] Physical-phone visual and touch confirmation after uploading the next experience version.
