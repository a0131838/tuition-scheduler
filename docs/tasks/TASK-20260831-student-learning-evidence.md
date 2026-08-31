# TASK-20260831-student-learning-evidence

## Context

Academic supervisors need a trustworthy way to export one student's verified class feedback as a PDF, then turn that evidence into a reviewed personalised learning plan. Existing feedback is linked to formal sessions and already has parent-facing structured sections, but it was not available as one internal evidence pack.

## Change

- Add an internal Student Learning Evidence workspace from the student detail page.
- Filter the pack by student, date range and course; include only published, non-draft feedback linked to formal student sessions and exclude student-excused sessions.
- Export a bilingual PDF with source range, feedback timeline, attendance/homework coverage, data-completeness gaps and teacher-recorded focus/next-step evidence.
- Add an auditable learning-plan draft record that preserves the selected evidence snapshot and records goals, teacher/student/parent actions and a review date; a protected academic user explicitly approves it before it can be treated as reviewed.
- Add deterministic trend indicators for feedback coverage and homework tracking. They describe recorded evidence only and do not claim AI-derived ability scores.

## Non-goals

- No automatic parent sending, public Mini Program access, or AI auto-publication.
- No changes to scheduling, attendance deduction, package balance, payroll, finance, contracts or existing feedback approval rules.
- No claim of progress where baseline, goal, homework, attendance or verified feedback evidence is missing.

## Verification

- Prisma schema validation and generated client.
- `npx tsx --test tests/student-learning-evidence.test.ts`.
- `npx tsc --noEmit` and `npm run build`.
- `git diff --check`.

## Risk

Medium-low. The feature exposes sensitive teaching evidence only behind the existing Admin/manager authorization boundary, records exports and plan creation in AuditLog, and does not mutate lesson records. PDF layout and the learning-plan workflow still require one authenticated production pass with a controlled student record after deployment.
