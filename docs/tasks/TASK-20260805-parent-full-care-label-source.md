# TASK-20260805-parent-full-care-label-source

## Context

The live `赵测试 2` record has an active accompanied Full Care engagement while its legacy student service-plan field is empty. The parent dashboard therefore fell back to ordinary-course wording despite loading the correct care project.

## Change

- Use the active pre-university Full Care engagement as the authoritative parent-facing label.
- Return `fullCareActive` from the parent student list.
- Keep the formal-report entry visible for active Full Care students.
- Prefer the care programme label on the Home page.

## Non-goals

- Do not rewrite the student's legacy classification.
- Do not alter the active care engagement, contracts, packages or finance records.

## Verification

- Focused parent mini-program tests.
- TypeScript validation and production build.
- Mini-program release audit.
- Live `赵测试 2` API and WeChat Developer Tools verification.

## Risk

Low because this changes only read-time presentation and uses the existing active engagement as the source of truth.
