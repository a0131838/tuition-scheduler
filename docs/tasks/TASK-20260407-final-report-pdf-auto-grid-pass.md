# TASK-20260407-final-report-pdf-auto-grid-pass

## Goal

Remove the large empty corner space from the parent-facing `Final Report` PDF by letting the lower content cards reflow based on the actual number of filled sections.

## Scope

- Update the lower grid logic in `app/api/admin/final-reports/[id]/pdf/route.ts`
- Keep the PDF on one page
- Do not change final-report fields or data

## Changes

- Replace the fixed 3-column lower grid with an adaptive row distribution
- Let one or two filled sections expand wider instead of leaving empty columns
- Keep the rest of the parent-facing PDF wording and content unchanged

## Non-Goals

- No changes to teacher final-report forms
- No changes to admin assignment, delivery, share, exempt, or archive workflows
- No changes to package balances, attendance logic, or finance logic

## Verification

- `npm run build`
- Post-deploy startup check confirms `local / origin / server` alignment
- Downloading `/api/admin/final-reports/[id]/pdf` still returns `200 application/pdf`
