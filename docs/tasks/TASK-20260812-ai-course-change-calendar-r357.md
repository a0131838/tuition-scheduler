# TASK-20260812 AI course-change calendar r357

## Scope

- Fix Mini Program AI detail back-navigation so the first back returns to the AI queue and preserves its position.
- Add a full student calendar to course-change preview for the relevant natural month(s).
- Use grey for unchanged lessons, red strike-through for the original lesson, and orange for the proposed lesson.
- Return only minimum read-only lesson facts from the protected formal preview endpoint.

## Safety boundary

- No formal scheduling, attendance, package, fee, payroll or notification write path changes.
- Existing permission, preflight token, conflict, lesson and idempotency gates remain authoritative.
- No schema or data migration.

## Verification

- `npx tsx --test tests/ai-ticket-execution.test.ts`: 8/8.
- `npm run build`: pass.
- Mini Program device visual verification and development upload are required after release packaging.

## Rollback

Revert the r357 code commit and redeploy the prior application artifact. No data rollback is required.
