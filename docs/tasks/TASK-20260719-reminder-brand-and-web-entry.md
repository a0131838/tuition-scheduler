# TASK-20260719-reminder-brand-and-web-entry

## Context

Course reminder images used the English placeholder brand `BOSS EDUCATION`, which did not match the miniapp name “博思学业管家”. Teacher reminders also referred only to the employee miniapp even though teachers already have a secure web schedule desk. Parents and students do not currently have an independent web login, so reminder copy must not advertise an unavailable parent web portal.

## Change

- Replace the share-image brand with “博思学业管家” for parent and teacher reminder images.
- Direct teachers to either the employee miniapp or `https://sgtmanage.com/teacher` for course verification.
- Direct parents and students to the existing parent miniapp for the complete schedule.
- Add the same role-specific access explanation and teacher-web link to the admin communication workspace.
- Keep the portal wording inside the presentation line so existing completed reminders update without generating false course-correction tasks when lesson lines are unchanged.

## Non-goals

- No parent web login or new public schedule route was created.
- No Session, attendance, package, finance, payroll, reminder timing, recipient selection or permission rule changed.
- No historical communication, schedule or student data is rewritten.

## Verification

- Twelve focused communication and share-image tests passed.
- All 221 repository tests passed.
- TypeScript and the 41-page miniapp release audit passed.
- The production build generated all 208 routes/pages.
- Parent and teacher 1080×1440 reminder images were visually inspected: the Chinese brand is readable, the absolute date remains visible, and each audience receives only an available access path.

## Risk

Low. This changes reminder presentation and a web-workspace link only. Existing sent images are static and must be downloaded again to receive the new brand and footer.

## Rollback

Rollback to `921f2f5913ced880a734cfd5ee97228e851b6988` (`2026-07-19-r271`).
