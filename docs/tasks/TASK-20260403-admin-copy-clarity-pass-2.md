# TASK-20260403-admin-copy-clarity-pass-2

## Goal

Run the second admin/teacher copy-clarity pass on high-traffic workbench pages so labels, hints, and workflow text read more naturally in bilingual mode without changing any business logic.

## Scope

- `app/teacher/tickets/page.tsx`
- `app/admin/reports/teacher-payroll/page.tsx`
- `app/admin/reports/partner-settlement/billing/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260403-admin-copy-clarity-pass-2.md`

## Changes

1. Teacher ticket board
   - Rewrite error banners into clearer action-oriented copy.
   - Make the search placeholder and status filter wording more natural.
   - Clean up proof-file and completion-note labels so they read correctly in bilingual mode.

2. Admin teacher payroll workbench
   - Simplify queue labels and action wording so operators can read the workflow faster.
   - Rewrite filter and jump-link labels into more natural operator-facing copy.
   - Tighten the batch payout success message and summary card wording.

3. Partner settlement billing center
   - Smooth out tab titles, billing form labels, and export column names.
   - Replace mixed or stiff phrases with plainer bilingual wording.

## Guardrails

- No payroll math changes.
- No ticket workflow or permission changes.
- No partner billing or receipt logic changes.
- No route, query-param, or storage behavior changes.

## Verification

- `npm run build`
- Logged-in local QA on the three touched pages
- Post-deploy logged-in production QA on the same pages

## Release

- Release target: `2026-04-03-r04`
- Status: `LIVE`
