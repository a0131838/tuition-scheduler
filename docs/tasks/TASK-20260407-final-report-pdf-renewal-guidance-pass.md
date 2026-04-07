# TASK-20260407-final-report-pdf-renewal-guidance-pass

## Goal

Make the parent-facing `Final Report` PDF read more like a family handoff that highlights progress and encourages the next learning step, rather than a neutral system summary.

## Scope

- Update the printable layout in `app/api/admin/final-reports/[id]/pdf/route.ts`
- Keep the PDF to one page
- Do not add or change any final-report database fields

## Changes

- Reframe the top summary block as `Progress and continuation / 阶段成果与续课方向`
- Change the package-completion wording into a more family-friendly stage-completion label
- Replace the short `Recommended next step` label card with a fuller `Recommended continuation / 续课建议` narrative
- Reuse existing `recommendation`, `areasToContinue`, and `finalLevel` data to generate a clearer continuation message
- Keep internal delivery/admin metadata hidden from the parent-facing PDF

## Non-Goals

- No changes to teacher final-report forms
- No changes to admin assignment, delivery, share, or archive workflows
- No changes to package balances, attendance logic, or finance logic

## Verification

- `npm run build`
- Post-deploy startup check confirms `local / origin / server` alignment
- Downloading `/api/admin/final-reports/[id]/pdf` still returns `200 application/pdf`
