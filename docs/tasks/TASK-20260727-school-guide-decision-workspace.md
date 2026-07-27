# TASK-20260727 School Guide Decision Workspace

## Goal

Make the Singapore School Guide behave like a practical family decision workspace: start from a task, narrow options with explainable matching, save schools into a plan, and request human review when needed.

## Scope

- Public web School Guide pages and styles.
- Public catalog safe-case projection.
- WeChat miniapp School Guide pages, shared internal navigation and local plan.
- Product plan and release documentation.

## Explicit non-scope

- Parent, employee, teacher and admin authentication or dashboards.
- Scheduling, attendance, packages, billing, payroll, feedback, renewals, communications and Tickets.
- Publishing any real client case without consent and anonymization.
- Predicting admission probabilities.

## Acceptance criteria

- Five stable entries on web and miniapp: Home, Find schools, Smart matching, Cases and My plan.
- Matching uses verified official-source records, gives reasons and cautions, and deduplicates names.
- Existing favorites are visible in My plan.
- Empty case library truthfully explains its publication standard.
- Production build, TypeScript, focused tests and miniapp audit pass.

## Rollback

Revert the r286 commit and redeploy through the standard release script. There is no database migration or external data write to roll back; local browser/miniapp plan data can remain harmlessly stored.
