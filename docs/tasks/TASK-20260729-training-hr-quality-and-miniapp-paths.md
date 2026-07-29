# TASK-20260729-training-hr-quality-and-miniapp-paths

## Context

The training centre had a complete technical loop, but the HR audit found weak competency evidence: 23 modules shared the same generic safety quiz, practical evidence accepted ten characters, manager approval had no common rubric, learning order was unclear, and five mini-program functions lacked independent learning paths.

## Change

- Expand the controlled library from 23 to 28 bilingual modules and 296 PDF pages.
- Add beginner guides for staff login/binding/account switching, Sales, Finance, Full Care, and Parent/Student Support.
- Maintain eight role-based mini-program paths when combined with the existing Academic/CS, Teacher, and Management guides.
- Classify every module as Foundation, Role Core, or Specialist and sort the employee page in that order.
- Add estimated learning time and three bilingual learning objectives to every module.
- Replace the single shared question array with a distinct five-question role-context set for each module.
- Lock practical submission until the employee confirms reading and passes the quiz at 80% or above.
- Require structured evidence: training-data reference, verified final result, and rubric-based self-check.
- Add a four-item bilingual manager competency rubric.
- Require rubric confirmation, current-version readiness, and specific rework instructions.
- Block manager self-sign-off.
- Record the audit findings and follow-up HR recommendations.

## Non-goals

- Do not grant system permissions from training roles.
- Do not change primary roles, additional training-role assignments, or workspace access.
- Do not alter scheduling, attendance, packages, contracts, finance, payroll, settlement, Full Care, or parent-visible data.
- Do not automatically mark any employee complete.

## Verification

- All 28 assigned PDFs exist, contain at least eight pages, and passed Chinese and English text checks.
- Total controlled PDF content: 296 pages.
- The new Finance mini-program guide rendered as nine pages and passed full contact-sheet review.
- The 28-module catalogue rendered as four pages without clipping.
- All 119 backend tests passed.
- TypeScript passed.
- The complete 229-page production build passed.
- An authenticated administrator training page returned HTTP 200 with 25 assigned modules, learning-order guidance, learning briefs, and 25 correctly disabled practical submissions before prerequisite completion.
- The authenticated PDF library returned 25 role-allowed cards.
- The new Finance mini-program PDF downloaded with HTTP 200 and attachment disposition.
- Temporary authenticated verification-session cleanup: 0 remaining.

## Risk

Low to moderate and isolated to training. Employees and managers must provide stronger evidence, so some previously tolerated short submissions will now be rejected. No operational workflow or business data is changed.
