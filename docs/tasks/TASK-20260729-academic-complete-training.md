# TASK-20260729-academic-complete-training

## Objective

Make the Academic/CS curriculum complete enough for a new employee with no system experience to follow the work in order, while keeping ADMIN full-library oversight and preserving all operational permissions.

## Scope

- Add two bilingual, ten-page, step-by-step modules:
  - daily start, duplicate checking, student setup, Student 360 verification, and handover;
  - teacher coordination, availability, scheduling exceptions, official-session verification, and handover.
- Give CS training access to seven existing Academic workflows that were missing from the role curriculum:
  - contract/package/Finance gate;
  - attendance and scheduling exceptions;
  - shared-package course changes;
  - Shanghai Xinzhuosi student/package setup;
  - Shanghai Xinzhuosi partner settlement;
  - school applications;
  - EduTrust courses and SSG contracts.
- Organise Academic training into 12 functional work chains.
- Regenerate the controlled catalogue and all training wrappers at release `20260729D`.
- Preserve Finance approval, payment, external signing, scheduling, package, attendance, and all other operational authorisation boundaries.

## Completion standard

- 35/35 registered modules have downloadable bilingual PDFs, totalling 365 pages.
- ADMIN can access all 35 modules.
- CS receives exactly 20 relevant modules and cannot access unrelated Finance-only or Teacher-only modules.
- Both new modules include preparation, six numbered actions, real annotated screenshots, save/result checks, stop conditions, and a final checklist.
- Automated tests, TypeScript, production build, rendered PDF inspection, deployment, authenticated access checks, and temporary-session cleanup pass.

## Verification completed before deploy

- Registry count: 35 modules / 365 PDF pages / 35 ADMIN-visible / 20 CS-visible / 11 TEACHER-visible.
- Both new ten-page PDFs passed extracted-text, non-blank-page, and full contact-sheet inspection.
- The four-page 35-module catalogue passed visual inspection without clipping.
- `npm run test:backend`: 126/126 passed.
- TypeScript passed.
- The complete 229-page production build passed.

## Verification completed after deploy

- Runtime feature commit `857bb8584870fd4afd4f82a944fdd4a430adee2c` deployed with PM2 PID `2197584`; `/admin/login` returned HTTP 200.
- Authenticated ADMIN library returned HTTP 200 and showed exactly 35 modules at release `20260729D`.
- Authenticated CS library returned HTTP 200 and showed exactly 20 modules at release `20260729D`.
- ADMIN and CS downloaded both new Academic PDFs with HTTP 200.
- CS downloaded all seven newly assigned Academic specialist PDFs with HTTP 200.
- CS access to `FINANCE_MASTER` and `TEACHER_REPORTS_ASSESSMENTS` returned HTTP 403.
- Temporary production authentication-session residue: 0.

## Risk

Low to moderate and limited to training access and required retraining. CS receives more learning material, including workflows that require a Finance, manager, or authorised signatory handoff, but gains no new operational permission. Release `20260729D` intentionally requires acknowledgement of the expanded curriculum.
