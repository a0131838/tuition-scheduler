# TASK-20260403-admin-copy-clarity-pass-3

## Goal

Run the third admin copy-clarity pass on the ticket center, finance workbench, and teacher payroll detail view so high-traffic bilingual labels read more naturally without changing any workflow logic.

## Scope

- `app/admin/tickets/page.tsx`
- `app/admin/finance/workbench/page.tsx`
- `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260403-admin-copy-clarity-pass-3.md`

## Changes

1. Admin ticket center
   - Rewrite error banners and management-focus copy into cleaner operator-facing wording.
   - Clean up intake-link labels, queue labels, and ticket action placeholders.
   - Replace mixed `zh / en` option rendering with normal bilingual helper output where possible.

2. Finance workbench
   - Make search and advanced filter wording clearer for invoice/receipt follow-up work.
   - Rewrite reminder-preview copy into plainer read-only guidance.
   - Rename reminder detail labels so they explain the workflow better.

3. Teacher payroll detail
   - Make back link, scope selector, and anomaly filters easier to understand.
   - Rename the period label and detail-filter action into clearer workbench language.
   - Remove the unused combo-summary status column header to match the actual data table.

## Guardrails

- No ticket workflow or permission changes.
- No finance workbench routing, reminder logic, or approval behavior changes.
- No payroll math, completion rules, or teacher-session data changes.
- No route, query-param, or storage behavior changes.

## Verification

- `npm run build`
- Logged-in local QA on the three touched pages
- Post-deploy logged-in production QA on the same pages

## Release

- Release target: `2026-04-03-r05`
- Status: `LIVE`
