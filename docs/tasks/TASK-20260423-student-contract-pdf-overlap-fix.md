# TASK-20260423 Student Contract PDF Overlap Fix

## Goal

Fix the new student contract PDF layout so long bilingual header text and wide student/course/package summary values no longer overlap when the contract is downloaded.

## Scope

- Rework the contract PDF header to place:
  - title
  - brand name
  - legal company line
  using measured text height instead of hard-coded Y offsets.
- Rework the contract summary box so:
  - long student names wrap safely
  - long course names wrap safely
  - package summary stays inside its column
  - the agreement-date line moves down with the tallest content block

## Non-goals

- No change to contract statuses, tokens, signing rules, storage, or contract workflow.
- No change to contract content, only PDF layout.

## Key Files

- `lib/student-contract-pdf.ts`
- `docs/tasks/TASK-20260423-student-contract-pdf-overlap-fix.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risks

- Low. This change only affects contract PDF rendering layout.
- The main risk is visual regression on short-content contracts, so the fix must be checked with a real generated PDF instead of build-only validation.

## Verification

- `npm run build`
- Generate a real sample student contract PDF from the contract library flow
- Render the PDF to an image preview and confirm:
  - header title no longer collides with company lines
  - student/course/package summary content no longer overlaps
  - agreement-date line stays below the tallest summary value
