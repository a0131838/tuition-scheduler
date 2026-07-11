# TASK-20260711-miniapp-scheduling-coordination

## Context

The staff miniapp already showed daily lessons, but the lesson detail was effectively teacher-only because it loaded attendance and feedback endpoints that require a linked teacher profile. 教务 and management need to open a lesson while away from a desktop, record parent/teacher scheduling communication, and keep the existing Ticket workflow moving.

## Change

- Add a common staff lesson-detail API with server-side teacher scoping and explicit role capabilities.
- Show lesson, teacher, student, and location details for authorized staff before loading role-specific tools.
- Keep attendance and after-class feedback limited to the teacher assigned to the lesson.
- Allow ADMIN, CS, and active CS-workspace staff to create or reuse a `排课协调` Ticket for a selected lesson student/course.
- Record communication target, result, next action, follow-up date, and coordination status; append each communication entry to the internal Ticket notes.
- Create or refresh the existing parent-availability link and let staff copy it from the miniapp.
- Reuse the current Ticket source, owner, deduplication, status-transition, audit, and parent-availability models.

## Non-goals

- No mobile lesson-time, teacher, room, or class writes.
- No attendance deduction, package ledger, billing, receipt, payroll, or OpenClaw changes.
- No parent-visible publication of internal scheduling communication notes.
- No automatic WeChat message sending.

## Verification

- `npx tsc --noEmit`
- Miniapp JavaScript syntax, JSON parse, and affected WXML expression checks.
- Role-capability checks for ADMIN, CS workspace, and TEACHER scoping.
- Read-only real-data check of the 2026-07-11 schedule and lesson-detail DTO.
- Authenticated ADMIN staff GET smoke checks for lesson detail and coordination context.
- `npm run build`

## Risk

Medium. The feature writes Ticket coordination state and internal notes, but does not execute scheduling changes. Existing open coordination Tickets are reused only when student and course labels match, and invalid status transitions are rejected.
