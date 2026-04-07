# TASK-20260407-final-report-pdf-body-dedup-pass

## Goal

Reduce repeated meaning in the parent-facing `Final Report` PDF by avoiding a second body card that says the same thing as the teacher's own `Areas to keep strengthening`.

## Scope

- Update section-visibility rules in `app/api/admin/final-reports/[id]/pdf/route.ts`
- Keep the PDF on one page
- Do not change any final-report fields or stored data

## Changes

- Keep the top summary row as-is
- Hide the separate `Next learning focus` body card whenever `areasToContinue` already has teacher-written content
- Preserve the body card only when the teacher did not provide an `areasToContinue` section

## Non-Goals

- No changes to teacher final-report forms
- No changes to admin assignment, delivery, share, exempt, or archive workflows
- No changes to package balances, attendance logic, or finance logic

## Verification

- `npm run build`
- Post-deploy startup check confirms `local / origin / server` alignment
- Downloading `/api/admin/final-reports/[id]/pdf` still returns `200 application/pdf`
