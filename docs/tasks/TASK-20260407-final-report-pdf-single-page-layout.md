# TASK-20260407 Final Report PDF Single Page Layout

## Goal

Make the admin final-report PDF fit onto a single page for normal-length reports, so operations can send a compact end-of-course handoff without multi-page overflow.

## Scope

- Rework `app/api/admin/final-reports/[id]/pdf/route.ts`
- Switch the final-report PDF to a denser landscape layout
- Compress the overview / outcome / delivery header blocks
- Render the narrative sections in a fixed multi-column single-page grid
- Auto-shrink body font size so longer but normal report text still fits within each card

## Non-Goals

- No changes to final-report data fields
- No changes to PDF permissions, share links, or delivery logic
- No changes to midterm-report PDFs
- No changes to attendance, package, payroll, or finance logic

## Output

- Final-report PDFs now render in a one-page landscape layout
- Normal report content should no longer spill into a second page
- The PDF still includes:
  - overview
  - outcome snapshot
  - delivery record
  - goals / summary / strengths / next-step guidance
  - attendance / homework comments
  - parent note / delivery note / teacher note

## Validation

- `npm run build`
- Download a final-report PDF from `/admin/reports/final`
- Confirm the generated PDF uses the new compact single-page landscape layout
