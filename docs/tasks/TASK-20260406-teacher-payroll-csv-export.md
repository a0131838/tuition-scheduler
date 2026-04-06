# TASK-20260406 Teacher Payroll CSV Export

## Goal

Add a batch CSV export under the admin teacher payroll workbench so finance can export all visible teacher payroll rows for a given payroll month without opening each teacher detail page one by one.

## Scope

- Add a read-only export route:
  - `app/admin/reports/teacher-payroll/export/route.ts`
- Add an `Export CSV / 导出 CSV` entry on:
  - `app/admin/reports/teacher-payroll/page.tsx`
- Keep export aligned with the current workbench filters:
  - `month`
  - `scope`
  - `q`
  - `pendingOnly`
  - `unsentOnly`

## Non-Goals

- No payroll calculation changes
- No approval-flow changes
- No payout changes
- No teacher-side UI changes

## Output

Each CSV row represents one teacher payroll summary row and includes:

- payroll month
- scope
- teacher name
- sessions
- cancelled but charged count
- completed count
- pending count
- hours
- salary totals
- sent flag
- teacher confirmed timestamp
- manager approval count
- finance confirmed timestamp
- finance paid timestamp
- finance rejected timestamp
- finance reject reason
- workflow label

## Validation

- `npm run build`
- open `/admin/reports/teacher-payroll`
- confirm `Export CSV / 导出 CSV` appears next to the filter controls
- open `/admin/reports/teacher-payroll/export?...`
- confirm response status `200` and `Content-Type: text/csv`
