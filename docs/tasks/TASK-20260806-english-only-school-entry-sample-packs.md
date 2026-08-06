# TASK-20260806 English-only School-entry Sample Packs

## Goal

Make public entry-test examples easier for families to use by focusing only on English and providing enough questions to reveal meaningful differences in foundational language performance.

## Delivered scope

- Rebuilt four public packs: AEIS Primary, AEIS Secondary, international-school Primary and international-school Secondary.
- Removed every mathematics question from these four downloadable packs.
- Expanded each pack to 19-23 numbered English tasks instead of a few demonstration prompts.
- Covered vocabulary, grammar, cloze, reading comprehension, evidence use, writing and editing at age-appropriate levels.
- Added basic reference answers or observation criteria, a parent record page and clear next steps.
- Kept the disclaimer that the material is GT/Boss original practice, not official MOE or school examination content and not an admission prediction.
- Corrected the PDF generator from a non-embedded CID font to an embedded Unicode font after visual inspection found invisible text in the prior renderer output.
- Added selective generation so updating these four public packs does not rewrite unrelated downloads.

## Truth and safety boundary

- Official AEIS and school pathway descriptions continue to show the real published examination subjects, including mathematics where applicable.
- English-only is a public practice-product decision, not a statement about official examination scope.
- No change to formal assessment question banks or scoring.
- No change to login, permissions, scheduling, lessons, packages, finance, payroll, renewals, tickets or communications.

## Verification and rollout

- Extract text from all four PDFs and confirm 19-23 questions and no mathematics content.
- Render and visually inspect all pages for visible text, clipping, spacing and page numbering.
- Run focused school-guide tests, complete backend regression, TypeScript, native Mini Program checks, Mini Program release audit and production build.
- Expected release: `2026-08-06-r341`; planned WeChat development version: `1.0.38`.
