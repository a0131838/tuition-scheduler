# TASK-20260425 Academic Management Student Type Lanes

## Scope

- Correct academic management grouping so student identity is based on `Student.studentType`.
- Keep package settlement mode as a warning signal only.
- Keep OpenClaw, scheduling, attendance, billing, contracts, payroll, and settlement calculations unchanged.

## Real Data Checked

- Active hour packages with remaining balance: 51
- Active-package students: 50
- Corrected student-type lanes:
  - Own students: 17
  - Partner students: 29
  - Unclassified: 4
- Unclassified cleanup rows: 张磊, lily, 邵楚然, 李东恒
- No active-package student currently has mixed own/partner package-settlement lanes.

## Implemented

- Academic management filters now classify by student type only.
- Added `未分类` lane for active-package students with missing or unrecognized student type.
- Todo Center and Academic Management Monthly Report show package settlement warnings without changing the student lane.
- Tests now cover student-type filtering, unclassified records, and package warning behavior.

## Out of Scope

- Editing existing student type records.
- Editing package settlement mode.
- Changing partner settlement or direct-billing finance behavior.
