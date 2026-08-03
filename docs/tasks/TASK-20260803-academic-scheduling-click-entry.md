# TASK-20260803-academic-scheduling-click-entry

## Context

The 40-page Academic scheduling guide covered scheduling scenarios but began too late in the workflow. A completely new employee still could not see how to enter Students, switch to the full list, search, open Student Detail, or reach Quick Schedule.

## Change

- Added exact login and workspace verification.
- Split Dashboard → Students → Full List → search → Apply → student name → Quick Schedule into separate numbered Chinese and English steps.
- Added a separate sidebar entry step for Scheduling Work Orders.
- Captured and annotated four real Web screenshots with TEST CRM training data.
- Expanded the guide to 22 Chinese steps and 22 English steps across 54 pages.
- Versioned only the scheduling module as `20260803C` and increased its training estimate to 120 minutes.

## Non-goals

- No change to scheduling writes, sessions, classes, tickets, packages, finance gates, attendance, payroll, contracts, permissions, parent-visible content, or Mini Program logic.
- No production scheduling form was submitted while capturing screenshots.

## Verification

- PDF has 54 A4 landscape pages with zero blank pages.
- Extracted text includes `Full List / 完整列表`, `Apply / 应用`, `Quick Schedule / 快速排课`, `Scheduling Work Orders / 排课执行工单`, and `20260803C`.
- Contact-sheet and representative entry pages passed visual inspection.
- Focused tests, full repository tests, TypeScript, production build, Mini Program audit, and `git diff --check` passed.

## Risk

Low. The module intentionally requires Academic staff to retrain on the corrected click path. The PDF is larger, but operational code and production data are unchanged.
