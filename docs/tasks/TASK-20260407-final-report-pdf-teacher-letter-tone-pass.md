# TASK-20260407-final-report-pdf-teacher-letter-tone-pass

## Goal

Refine the parent-facing `Final Report` PDF so the layout reads more like a teacher's reflection to the family, with softer headings and summary labels.

## Scope

- Update section titles and summary labels in `app/api/admin/final-reports/[id]/pdf/route.ts`
- Keep the PDF on one page
- Do not change the final-report form fields or stored data

## Changes

- Rename several body sections into more natural family-facing phrases
- Replace the summary-row recommendation label with `Current growth focus / 当前成长重点`
- Keep the document focused on progress, current gaps, and next-stage focus without direct renewal language

## Non-Goals

- No changes to teacher final-report forms
- No changes to admin assignment, delivery, share, exempt, or archive workflows
- No changes to package balances, attendance logic, or finance logic

## Verification

- `npm run build`
- Post-deploy startup check confirms `local / origin / server` alignment
- Downloading `/api/admin/final-reports/[id]/pdf` still returns `200 application/pdf`
