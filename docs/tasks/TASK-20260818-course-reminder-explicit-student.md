# TASK-20260818 Course Reminder Explicit Student

## Goal

Prevent an individually assigned session from generating parent reminders for every historical student enrolled in the reusable Class.

## Confirmed root cause

The 2026-08-19 10:00 session explicitly belongs to 徐子航, while its Class still has 10 historical Enrollment records. The reminder projection merged the explicit session student, one-to-one student and every class enrollment. After Emily completed 徐子航's real reminder, nine false reminders remained, exactly matching the screenshot.

## Fix

Student selection now follows one exclusive priority:

1. explicit Session.student;
2. fixed Class.oneOnOneStudent when no explicit student exists;
3. deduplicated Class enrollments only for a true group session.

No session, enrollment, attendance, package or communication audit record is deleted or rewritten.

## Verification

- Regression test failed before the fix with scheduled, fixed and historical students all returned.
- Communication/report tests passed 12/12 after the fix.
- Backend tests passed 180/180.
- TypeScript and the 251-page production build passed.
- Production read-only replay reduced the affected session's projected reminders from nine false items to zero remaining items because the one real reminder had already been completed.

## Production acceptance

- Guarded release confirms local, GitHub and server commit equality, PM2 online and /admin/login HTTP 200.
- Re-run the production read-only projection for session 04fb6fdb-b4c9-475b-8746-1575b1da7e70 and confirm zero remaining reminders.
