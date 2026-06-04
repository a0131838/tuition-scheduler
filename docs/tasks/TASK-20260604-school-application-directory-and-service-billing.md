# TASK-20260604 School Application Directory And Service Billing

## Request

School application contracts should not rely on manually typed school names, grades, programmes, or intakes. The first directory should include Singapore international schools and AEIS-related application options. New students with no lesson package should also be able to use this workflow.

## Implementation

- Added `lib/school-application-directory.ts` with selectable application targets:
  - MOE AEIS Primary
  - MOE AEIS Secondary
  - MOE S-AEIS Primary
  - MOE S-AEIS Secondary
  - MOE P1 International Student Registration Interest
  - Singapore international school options
- Changed school application rows from free-text school/programme/grade/intake fields to dropdown-based selections.
- Saving a row now resolves the chosen directory target into the stored school/application name.
- AEIS and S-AEIS entries can provide default official fee handling.
- Removed the requirement to select an existing lesson package before preparing a sign link.
- If a signed school application needs an invoice and no package was selected, the system creates a paused `School Application Service` service billing case for invoice and receipt workflow only.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test against the live Neon database:
  - created a temporary no-package student
  - created a school application draft
  - selected `MOE AEIS Secondary` and `Dulwich College (Singapore)` from the directory
  - saved the draft and confirmed directory names resolved correctly
  - confirmed AEIS official fee defaulted into the total
  - prepared a sign link
  - generated the agreement PDF
  - cleaned up temporary records
  - confirmed remaining temporary students: `0`

## Risk

Medium. The directory list should be reviewed operationally as schools open, rebrand, or close. The no-package path creates a paused service billing case only when an invoice is needed; it is not intended for lesson scheduling or balance deduction.
