# Final reports by learning period

## Problem

Early renewal adds hours to the existing billing package. Final report submission previously depended on that package's live balance, which could block an earlier period even after its teaching had ended.

## Workflow

1. In **Final Reports**, open **Manage learning periods** and search for the student. Select the purchase or renewal credit that corresponds to the period being reported.
2. Confirm the actual start and end in Singapore time. Adjacent periods may share a boundary between lessons. The system rejects overlapping periods, a boundary inside an attended lesson, and a period with no matching attendance.
3. Choose the teacher. Link their existing active draft for the same student and package, or assign a new draft if none applies. The chosen period's attended time is frozen separately for that report.
4. The teacher submits the final report and can prepare the bilingual parent version. An academic coordinator or manager reviews and confirms the report. The assigned teacher can then download the parent PDF, and the existing delivery workflow can record the actual handoff.

Renewal credit is shown automatically when it exists in the package ledger. Its booking timestamp is a reference for the coordinator. A verified teaching boundary is still needed. Prior delivered reports and legacy records without a traceable credit remain available through the existing report desk.

## Verification

- Applied the migration to an isolated clone of the existing PostgreSQL database. Existing records were readable with a null period reference.
- Passed 49 focused tests and 185 backend regressions, and built the production app.
- In the browser, an academic coordinator with the operations-admin permission found an early renewal, kept an existing teacher draft and confirmed the first period. The teacher submitted with a positive package balance. Preview worked before academic review, the official PDF was blocked, and bilingual download succeeded after review.
- Tested concurrent confirmations, overlapping dates, a class crossing a boundary, invalid student and draft selection, and a separate Mini Program API submission for the second period. The frozen attendance totals were 120 and 90 minutes. Package totals, archived records and the first bilingual PDF stayed intact after the second submission. Translation content for this isolation test was supplied as a fixture.
- The Mini Program change is in the server API. The native package does not require a separate upload for this change.

## Rollback

The prior production code point is `453385c7741b352c05b5067fb0a7b58af67c0158`. Keep the additive schema if rolling back the app. Reports confirmed after this release will again follow the previous submission gate until compatible code is restored.
