# TASK-20260604 School Application Entry Points

## Request

The school application service feature was implemented, but the entry point was not visible enough in the live admin UI.

## Implementation

- Added `/admin/school-applications` as a dedicated admin entry page.
- Added a sidebar link under Core Workflows.
- Added a first-screen shortcut on each student detail page.
- Kept the existing per-student service workspace at `/admin/students/[id]/school-applications`.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`

## Risk

Low. This is navigation and discovery only. It does not change signing, invoice creation, receipt handling, lesson balances, attendance, scheduling, payroll, partner settlement, or Business Accounts.
