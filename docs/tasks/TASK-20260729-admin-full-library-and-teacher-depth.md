# TASK-20260729-admin-full-library-and-teacher-depth

## Objective

Give ADMIN complete training-library oversight and replace broad teacher coverage with role-specific, beginner-safe, bilingual, step-by-step modules backed by current production screenshots.

## Scope

- Make ADMIN able to view, download, learn, and supervise every training module, including modules whose learner role is TEACHER.
- Preserve all operational role and workspace permissions; this change affects training content access only.
- Add four teacher modules:
  - account, profile, notices, alerts, and daily start;
  - availability, scheduling exceptions, and assigned tickets;
  - academic assessments, midterm reports, and final reports;
  - expense claims, payroll reconciliation, and payment follow-up.
- Capture 15 current teacher pages with the production test-teacher account, red action callouts, and zero temporary-session residue.
- Regenerate the controlled bilingual PDFs and catalogue at release `20260729C`.

## Completion standard

- 33/33 registered modules have downloadable bilingual PDFs.
- The controlled library totals 345 PDF pages.
- ADMIN can access all 33 modules.
- TEACHER receives 11 relevant modules and cannot access unrelated Finance, Academic, or Management-only modules.
- Every new teacher PDF contains preparation, six numbered workflow steps, real screenshots, save/result checks, stop conditions, and a final checklist.
- Tests, TypeScript, production build, PDF rendering, deployment, authenticated access checks, and cleanup checks pass.

## Verification completed before deploy

- 15 production teacher pages captured with the linked test-teacher account; temporary authentication-session residue: 0.
- Four new teacher PDFs rendered as 10 pages each and passed title/text, non-blank-page, and contact-sheet inspection.
- The 33-module catalogue rendered as four pages without clipping.
- Registry count: 33 modules / 345 pages / 33 ADMIN-visible / 11 TEACHER-visible.
- `npm run test:backend`: 124/124 passed.

## Verification completed after deploy

- Runtime feature commit `e55fed18c7e481c320d94945f3e9ae0e3618b06f` deployed with PM2 PID `2184481`; `/admin/login` returned HTTP 200.
- Authenticated ADMIN library returned HTTP 200, showed all 33 modules and release `20260729C`, and allowed download of a TEACHER-only PDF.
- Authenticated TEACHER library returned HTTP 200 and showed exactly 11 relevant modules.
- All four new teacher PDFs returned HTTP 200 for the test-teacher account.
- TEACHER access to `FINANCE_MASTER` returned HTTP 403.
- Temporary production authentication-session residue: 0.

## Risk

Low to moderate and limited to training access and required retraining. ADMIN sees more training documents but receives no new operational permission. Teacher content version changes to `20260729C`, so current progress intentionally requires acknowledgement of the new material.
