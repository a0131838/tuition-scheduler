# TASK-20260527 Manager Quality History Dashboard

## Request

Management asked whether submitted manager quality feedback can have a dashboard to review previous feedback and the completion rate for ticked checklist items.

## Scope

- Add a history dashboard to `/admin/manager/quality`.
- Reuse existing manager reflection entries stored in `AppSetting`.
- Show selected history windows for 7, 14, 30, and 90 days.
- Show completion KPIs, per-checklist-item completion rates, and previous feedback rows.
- Add an incomplete-only filter for manager follow-up.

## Non-goals

- No database migration.
- No change to reflection submission storage shape.
- No change to approvals, Lead Desk data, scheduling, billing, payroll, teacher feedback, or OpenClaw workflows.

## Implementation

- Added `summarizeManagerReflectionHistory` as a pure helper for manager reflection KPI calculations.
- Extended `loadManagerQualityWorkspace` with a bounded `historyDays` parameter.
- Updated the Manager Quality page to render the reflection history dashboard and preserve the selected work date while filtering history.

## Verification

- `npx tsx --test tests/manager-quality-workspace.test.ts`
- `npm run build`

## Risk

Low. The feature only reads the existing reflection store and summarizes the current manager's own entries. Managers with no entries in the selected window see an empty-state dashboard.
