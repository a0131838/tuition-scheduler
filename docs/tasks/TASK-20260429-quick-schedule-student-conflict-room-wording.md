# TASK-20260429 Quick Schedule Student Conflict Room Wording

## Scope

- Clarify quick-schedule student time conflict messages.
- Prevent the existing session room from being mistaken for the newly selected room.
- Keep scheduling conflict logic unchanged.

## Real Data Checked

- Reported form state: `2026-05-14 17:30-19:00`, Orchard Plaza, `Room 3`.
- Orchard Plaza `Room 3` has no overlapping session in that window.
- The displayed `Room 1` row is an existing overlapping student session at `2026-05-14 18:00-19:30`.
- The conflict is student-time overlap, not selected-room occupancy.

## Implemented

- Added shared quick-schedule conflict wording for student session conflicts.
- Student conflicts now explicitly say `学生时间冲突（不是所选教室被占用） / Student time conflict, not selected-room conflict`.
- Existing session details are still shown for traceability.
- Applied the same wording to the student detail candidate list and quick appointment API create/preview path.

## Out of Scope

- Changing room conflict detection.
- Changing teacher availability checks.
- Changing scheduling writes, attendance, package deduction, billing, contracts, payroll, settlement, or OpenClaw.
