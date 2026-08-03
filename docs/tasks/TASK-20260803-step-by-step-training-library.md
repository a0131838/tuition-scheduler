# TASK-20260803-step-by-step-training-library

## Context

The previous bilingual PDFs placed Chinese and English inside every numbered action and sometimes reused screenshots across Web and Mini Program contexts. New employees had to switch language and platform repeatedly, and six registered modules were absent from the PDF generator.

## Change

- Rebuilt all 35 registered guides as single-function beginner SOPs.
- Fixed the document order to cover the complete Chinese workflow first, a visible language-divider page, and the complete English workflow second.
- Added six missing generated guides: Academic Mini Program, Parent Communication, Teacher Mini Program, Teacher Web Daily Workflow, Management Mini Program, and Management Communication Audit.
- Classified the library as 26 Web guides and 9 Mini Program guides.
- Added separate downloadable Web and Mini Program catalogue PDFs.
- Updated the training release to `20260803A` so previous read acknowledgements do not certify the revised material.
- Kept real annotated system screenshots and added consistent entry, target, action, save, refresh, completion, and stop checks to every step.

## Non-goals

- No business role or permission change.
- No change to Mini Program business logic.
- No change to finance, contracts, packages, attendance, payroll, scheduling, student, teacher, or parent-visible operational data.
- Historical PDFs remain available in the repository for audit but are no longer assigned as the current training version.

## Verification

- 35/35 registered module PDFs exist under the current date, plus two platform catalogues.
- 37 PDFs / 664 pages passed page-count, required-text, blank-page, and file-presence checks.
- 374 referenced screenshot paths exist; missing count is zero.
- Web Academic, Mini Program Academic, Teacher Web, and Web catalogue contact sheets were visually inspected.
- `npx tsc --noEmit --incremental false` passed.
- `npx tsx --test tests/training-center.test.ts tests/training-migration-safety.test.ts` passed 21/21 tests.
- `npx tsx --test tests/*.test.ts` passed 306/306 tests.
- `npm run miniapp:audit-release` passed all 54 Mini Program page checks.
- `npm run build` passed and generated 231 pages.

## Risk

Low to moderate. The change intentionally resets training progress to the new module version and substantially increases PDF page counts and repository size. Operational permissions and business data paths are unchanged.
