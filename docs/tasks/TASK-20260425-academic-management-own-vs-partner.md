# TASK-20260425 Academic Management Own vs Partner

## Scope

- Split academic management handling between direct/own students and partner students.
- Keep OpenClaw, scheduling, attendance, billing, contracts, payroll, and settlement calculations unchanged.

## Real Data Checked

- Total students: 77
- Active hour packages with remaining balance: 51
- Active direct/own packages by package settlement mode: 19
- Active partner packages by package settlement mode: 32
- Active direct/own students by filtered package lane: 18
- Active partner students by filtered package lane: 32
- Student types in production include `合作方学生`, `自己学生-新生`, `自己学生-留学+课程`, and legacy `直客学生`.

## Implemented

- Added shared academic student lane helpers for `全部学生`, `自己学生`, and `合作方学生`.
- Added lane filter pills to Todo Center academic management alerts.
- Added lane filter to Academic Management Monthly Report.
- Added visible student lane labels in academic management alert rows and monthly report rows.

## Out of Scope

- Changing student type records.
- Changing package settlement mode.
- Changing partner settlement or direct-billing finance behavior.
