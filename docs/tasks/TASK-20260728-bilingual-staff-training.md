# TASK-20260728-bilingual-staff-training

## Context

SGT Manage already supports `EN`, `ZH`, and `BILINGUAL` account languages, but the employee Training Centre still contained Chinese-only module metadata, quiz questions, practical instructions, manager controls, and 17 Chinese-only PDF assignments. Teachers and staff who do not read Chinese could not complete the same controlled training path.

## Change

- Add complete English content for all 23 module titles, categories, practical tasks, five quiz questions, and answer choices.
- Follow the signed-in account language throughout `/training`, `/training/manage`, `/training/coverage`, and training-role assignment.
- Keep `EN` English-only, `ZH` Chinese-only, and `BILINGUAL` English/Chinese side by side.
- Generate 17 new four-page A4 landscape bilingual training SOPs with end-to-end workflow, verified system screenshots, stop conditions, and practical sign-off.
- Reuse six existing bilingual detailed SOPs.
- Add a four-page bilingual controlled catalogue.
- Point every protected module download to a bilingual PDF and unify the training release version as `20260728`.
- Update the Full Care long-term plan and controlled training index.

## Non-goals

- Training roles do not grant system permissions.
- No database migration or automatic operational-data update.
- No changes to scheduling, attendance, deductions, contracts, packages, invoices, receipts, payroll, expenses, settlements, Full Care state machines, or parent-visible content.
- Historical Chinese SOPs remain available for audit and maintenance but are not assigned from the current employee training path.

## Verification

- Confirm all 23 module records have non-empty Chinese and English title, category, practical task, question, and answer-choice content.
- Confirm every assigned PDF exists and has `中英文` in its current filename.
- Render and inspect all 68 pages from the 17 newly generated module PDFs.
- Extract text from every new PDF and confirm English and Chinese content.
- Render and inspect the four-page bilingual catalogue.
- Run focused training/migration tests, TypeScript, all backend tests, and the complete production build.
- Run guarded release preflight and standard deployment, then verify PM2 and `/admin/login`.

## Risk

Low and isolated to training. The module release version changes to `20260728`, so an employee who completed an older module version must acknowledge and pass the current bilingual edition. This is intentional versioned retraining and does not change operational permissions or business data.

## Production verification

- Runtime commit `b048612d250e9842467763c68411dd847f939134` deployed through the guarded release workflow.
- Production completed the 228-page build, PM2 runs as PID `1939220`, and `/admin/login` returned HTTP 200.
- Existing EN, ZH, and BILINGUAL staff accounts each opened `/training` with HTTP 200.
- EN rendered English without the Chinese heading; ZH rendered Chinese without the English heading; BILINGUAL rendered both.
- All three language modes opened `SYSTEM_OPERATION_MAP` as `application/pdf` with HTTP 200.
- Temporary verification sessions were deleted; remaining test sessions: 0.
