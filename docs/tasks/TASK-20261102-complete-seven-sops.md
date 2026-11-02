# TASK-20261102-complete-seven-sops

## Context

The previous release refreshed 28 legacy manuals, but seven older 2026-11-02 PDFs had only partial screenshot corrections. Their placeholder images and generic instructions meant the original request to update every old manual was not yet complete.

## Change

- Complete the remaining seven bilingual guides: daily student records; first purchase, renewal, contract and package gates; finance; management controls; teacher payment details; teacher reports; and teacher expense/payroll.
- Replace every screenshot placeholder with a current relevant web-workflow capture from isolated training accounts. Rewrite each Chinese and English step with role-specific actions, checks and stop conditions. Update the guide-content version to `20261102A` and regenerate the seven A4 landscape PDFs.
- Preserve the existing training assessment versions and completion records. The staff catalogue already points to these 2026-11-02 files, so the refreshed PDFs replace the partial copies without changing routes or permissions.

## Verification

- Full catalogue audit: 35 module HTML/PDF pairs, 690 pages and 408 image references; every source image resolves, bilingual step counts match, no placeholder block or blank PDF page, and no detected text block outside page bounds.
- `npx tsx --test tests/training-center.test.ts`: 24/24 passed, including a check that the seven guides no longer contain placeholder/review wording and preserve assessment versions.
- `npm run build`: production build.
- Visual spot check of contract, finance and management PDF step pages after rendering. Screenshots are from synthetic local training data, not production records.

## Risk and follow-up

The 35 built-in manuals now have revised text and screenshots, but the separate SOP governance review state remains review-needed until an authorised owner signs off a live walkthrough. The guides cover representative role states; staff should report a mismatch through the existing SOP feedback workflow. No financial, attendance, package, payroll, scheduling or user data changes are included.

## Rollback

Revert this release commit to restore the previous seven PDF files; preserve SOP governance and training history.
