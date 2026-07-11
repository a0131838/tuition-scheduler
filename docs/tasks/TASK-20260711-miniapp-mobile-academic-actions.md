# TASK-20260711 Miniapp Mobile Academic Actions

## Goal

Let Eva and management complete the most frequent single-lesson academic operations from the native staff miniapp while preserving the desktop system's conflict, package, audit, and Ticket rules.

## Scope

- Show a scheduling Ticket's next 30 student lessons and open lesson detail.
- Handle future leave/cancellation with explicit charge or no-charge selection.
- Replace the teacher for one future Session with qualification and conflict checks.
- Complete matching leave, teacher-change, create, or reschedule Tickets only after a successful related write.
- Create a first one-on-one Session from an open `新排课`, `补课加课`, or `排课协调` Ticket.
- Resolve legacy Tickets without `studentId` only through a unique exact student-name match.
- Queue existing parent-visible Ticket status notifications after completion.

## Safety Boundaries

- ADMIN-only write access.
- Future Sessions only; no future-series batch edits.
- Fresh signed preview required before every apply.
- Revalidate availability, student/teacher/room conflicts, package eligibility, and Ticket state inside the write transaction.
- Block cancellation or teacher replacement when attendance or deduction evidence already exists.
- Teacher replacement changes only the Session override, not the Class default teacher.
- No automatic charge decision, billing, payroll, receipt, or OpenClaw changes.

## Verification

- TypeScript, miniapp JavaScript/WXML, diff, and full build checks pass.
- Charge/no-charge cancellation and replacement previews pass on real data without writes.
- Token tampering and unpreviewed Ticket selections are rejected.
- Ticket `20260709-009` uniquely resolves its legacy student name and passes first-scheduling preview.
- Route-level rejected applies leave Session, Attendance, Package, teacher-change history, and Ticket rows unchanged.
