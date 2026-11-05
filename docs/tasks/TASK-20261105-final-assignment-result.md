# TASK-20261105-final-assignment-result

## Context and evidence

After assigning a near-completion final-report draft, operations saw the admin header and sidebar with an empty report area. Read-only production data confirmed that the assignment was saved to the intended teacher. An isolated PostgreSQL database, fictional accounts and the production build reproduced an intermittent blank after `revalidatePath` plus Server Action redirect: the server returned the report content, but client navigation displayed no page heading, records or success notice. Waiting did not restore it; a full document reload did. No browser page error was captured. This establishes the failing navigation path; it does not establish a broader framework defect or a database/permission fault.

## Change

- Reuse the project's saved-result navigation pattern for the preparation and completed-package assignment forms: the authenticated server action returns its local result URL, and the client opens a complete document after the action resolves.
- Preserve all existing server-side eligibility, student/package membership, teacher and existing-report checks. Keep report-list invalidation for both admin and teacher paths.
- Add a result notice with the saved report's student, teacher, current status and a link to its row. Navigate to the notice so the previous long-list scroll does not hide it.
- Use parent form pending status to disable controls and display progress immediately, with a synchronous in-flight guard against rapid repeat submissions. If the response is lost, lock the current form and offer a normal document link to check records; never automatically retry an uncertain save.

## Verification

- `npx tsc --noEmit` passed.
- `npx tsx --test tests/report-package-progress.test.ts tests/learning-report-delivery.test.ts`: 8 passed.
- `npm run build` passed, including the final result-anchor build.
- Isolated browser regression: first assignment and five existing-task repeats, each with immediate double submit, exactly one action request and one full document navigation; one report throughout, correct saved-result ID, student/teacher/status receipt and row link.
- Stale preparation eligibility rejected visibly; completed-package assignment works; a submitted report remains submitted when assignment is attempted again.
- Simulated save followed by a dropped response: record is saved, warning appears, submit control is disabled, and the recovery link opens records without another assignment.
- Teacher sees the saved task and the existing draft-only-until-zero notice; package minutes unchanged by assignment. No browser page errors in the successful regression.
- Production verification uses guarded release equality/PM2/HTTP health and read-only record/source checks. It does not create sessions or submit a real report assignment.

## Risk and rollback

Low, limited to final-report assignment navigation and confirmation. Full document navigation may take longer than a partial transition, but guarantees a fresh result document. A result URL is restricted to the same-origin final-report desk. No schema change, migration, financial/lesson-ledger write or real report reassignment is included. Other report actions are out of scope. Roll back application code to `6733d099c29e02c38f15e93c0df2ba3209315460` while retaining report data.
