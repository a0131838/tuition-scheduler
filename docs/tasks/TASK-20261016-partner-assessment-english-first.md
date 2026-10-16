# TASK-20261016-partner-assessment-english-first

## Context

The parent miniapp had three nominal assessment choices, but AEIS primary/secondary sessions mixed English and Mathematics. Teachers reported that the intended intake is mainly children who need English support. The previous international English form also gave ages 6–8 and 9–11 the same long listening-heavy paper as older students, and displayed an uncalibrated CEFR reference. Partners could only forward the generic miniapp without a source-bound entry.

## Change

- English is the default choice. AEIS primary and secondary now each offer a separate English paper and an optional independent Mathematics paper; the result does not combine their scores. A family can start the Mathematics paper as soon as the English paper has been submitted.
- Ages 6–11 receive the existing age-specific 17-item international English question set. Older children retain the 51-item grammar/listening/reading/writing form. Listening audio may be replayed to support grouped questions.
- New reports state that scores are internal learning diagnostics and no longer map scores to CEFR or a claimed high confidence. Legacy sessions keep their old question IDs and scoring rules.
- An admin can create, disable, and count named partner entries. New assessment sessions validate the entry code on the server, record its partner, and carry the source into a consultation lead only after verification of the session token. Partner entries do not expose an individual answer or report.
- The admin page can request an official WeChat URL Link to the published miniapp page. It cannot produce a usable external link before that page is in a formal release.
- The miniapp privacy notice now explains entry-source collection and the boundary of partner access.

## Verification

- `DATABASE_URL=... DIRECT_DATABASE_URL=... npx prisma validate` (dummy local validation URLs; no database connection)
- `npx tsc --noEmit --incremental false`
- `npm run build` (dummy local validation URLs; no database writes)
- `npx tsx --test tests/school-guide-*.test.ts tests/miniapp-consumer-entry.test.ts`: 85 passed
- `npm run miniapp:audit-release`: 69 pages, no errors
- `node --check` on changed miniapp JavaScript and `git diff --check`

## Acceptance before external distribution

1. Have a teacher review every English and Mathematics question, answer, age band, writing rubric and report wording. The primary English paper is an internal CEQ-readiness check, not a CEQ simulation. The secondary English paper is a short diagnostic, not the SEAB 2-hour-10-minute paper. The Mathematics papers contain only multiple-choice questions, while SEAB also requires written working.
2. Deploy backend migration, upload new miniapp development/experience build, and test start → answer → submit → teacher grading → report → optional Mathematics → consultation lead on a real phone. Verify partner attribution and invalid/disabled entry handling.
3. Publish the miniapp formal version through WeChat review. Generate one URL Link per named partner in the admin page and test the actual link before forwarding it.

## Risk

Medium: assessment content and score interpretation need teacher validation, and a WeChat formal release is required for an external URL Link. Database migration is additive; existing sessions and lead ownership remain intact.
