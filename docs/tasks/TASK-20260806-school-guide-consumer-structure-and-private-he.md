# TASK-20260806 School Guide Consumer Structure and Private Higher Education

## Goal

Make the public guide feel like a focused consumer product, correctly classify church schools and public/private education, and give families useful course-level private higher-education information without misrepresenting partner-university rankings.

## Delivered scope

- Simplified the Web and Mini Program home to three primary actions.
- Moved the two-minute selector into Find Schools.
- Added a curated comparison entry for SAS, Dulwich, UWCSEA, Tanglin, NLCS Singapore, ACS International, Hwa Chong International and SJI International.
- Expanded the popular private higher-education set from eight to ten with Amity Global Institute and Kingston International College.
- Structured all ten profiles into awarding partners, programmes, ranking scope, 2026 fees/intakes, entry standards and payment checks.
- Moved San Yu Adventist School and St Francis Methodist School into `教会学校` under the church/religious subgroup.
- Split preschool discovery into Infant Care, Child Care, Kindergarten, MOE Kindergarten and policy/operator information.
- Removed generic preparation downloads from preschool, private university, public postsecondary, arts, SPED and other non-exam routes. Only international-school and AEIS/S-AEIS preparation remains visible.

## Data rules

- A PEI does not inherit the ranking of its highest-ranked partner university.
- Every ranking statement must identify the university, ranking system and year.
- Fees are dated 2026 examples from official course material and do not replace the Student Contract.
- Promotions and grants are never presented as the standard course fee.
- Where a course has no published 2026 intake, the page states that it is not currently planned instead of implying availability.

## Safety boundary

- Public guide content and navigation only.
- No schema or database migration.
- No changes to login, parent/staff permissions, scheduling, lessons, packages, finance, payroll, renewals, tickets or communication workflows.

## Verification

- TypeScript and focused school-guide tests.
- Complete backend regression and Mini Program release audit.
- Production build and live catalog/profile checks.
- Expected release: `2026-08-06-r338`; expected Mini Program development version: `1.0.35`.

## Rollout result

- Runtime feature commit: `2fd3518146ad870b88c4c8bef333b8795805765e`.
- Local, GitHub and production server were aligned; PM2 PID `1742381` was online and health returned HTTP 200.
- Live API returned 10 popular private higher-education profiles, the new preschool groups and four permitted preparation packs.
- WeChat development version `1.0.35` uploaded successfully at 710,808 bytes.
- Remaining manual action: designate `1.0.35` as the experience version and complete physical-phone checks.

## 2026-08-06 r339 follow-up: partner programmes and QS

- Added a single structured source mapping for ten priority private higher-education profiles.
- Separated each provider by awarding university, direct-campus status or self-awarded status.
- Added exact published programme names under the matching partner and academic level; removed generic “related programmes” placeholders where the current degree name could not be verified.
- Added QS World University Rankings 2027 context to each partner. A Singapore PEI does not inherit a partner's ranking, and a partner not in the overall table is shown as unlisted rather than being assigned another ranking.
- Added the same dedicated matrix to Web and Mini Program detail pages.
- Data release: `2026-08-06-r339`; planned Mini Program development version: `1.0.36`.
- Safety boundary remains public guide content only, with no schema, operational workflow or authenticated-role changes.
- Runtime feature commit `43215a913999a282016a9d11e11979147adb55de` is live with PM2 PID `1759072` and health HTTP 200.
- Live catalog returned `2026-08-06-r339`; representative APIs returned the expected partner and programme matrices.
- WeChat development version `1.0.36` uploaded successfully at 713,226 bytes.
- Remaining manual action: designate `1.0.36` as the experience version and inspect long programme lists on a physical phone.
