# TASK-20260407 Final Report PDF Parent Facing Pass

## Goal

Make the final-report PDF feel like a parent handoff instead of an internal operations sheet.

## Scope

- Update `app/api/admin/final-reports/[id]/pdf/route.ts`
- Remove internal/admin-heavy sections from the printable PDF:
  - delivery record
  - internal forwarding metadata
  - teacher internal note
  - parent delivery note
- Hide empty blocks instead of rendering `-`
- Keep the one-page landscape layout, but focus the visible content on:
  - course overview
  - final snapshot
  - final outcome summary
  - progress and strengths
  - areas to continue
  - recommended next step
  - parent note
  - optional learning-habit observations

## Non-Goals

- No changes to final-report database fields
- No changes to admin delivery/share actions
- No changes to midterm-report PDFs
- No changes to attendance, package, payroll, or finance logic

## Output

- The PDF reads more like a family-facing end-of-course summary
- Internal admin metadata is no longer visible in the printable handoff
- Empty sections do not consume visible space
- The layout still stays on one page for normal-length reports

## Validation

- `npm run build`
- Download a final-report PDF from `/admin/reports/final`
- Confirm the generated PDF focuses on progress, final outcome, and next steps
