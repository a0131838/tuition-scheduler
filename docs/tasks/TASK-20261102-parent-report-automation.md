# TASK-20261102-parent-report-automation

## Request and parent experience

The owner authorized replacing manual report reformatting with a complete reusable parent-facing report workflow, prioritizing how parents understand and read it. Scope includes both existing course midterm and final reports. This is not a new full-care monthly report, and it does not authorize automatic parent messaging or rewriting historical teacher evaluations.

Parents first see student/course/date/learning period/actual attendance, supplied current results and explicitly labelled future targets. A short labelled AI family summary is followed by complete teacher comments, strengths, difficulties, learning habits and next-stage suggestions. Chinese comes first in bilingual PDFs and English originals follow in a smaller readable style. Long text flows onto new portrait pages rather than becoming numbered Full text excerpts. Unknown metadata is not inferred, and aggregate scores are not calculated from narrative sub-scores.

## Teacher and academic workflow

1. Open the assigned Midterm or Final Report and complete the existing form.
2. Click Save, submit and generate parent report. The existing save action and attendance snapshot are reused; AI generation starts after the original is saved.
3. A short HTTP request claims a source-version job, returns 202 and starts the model using Next.js after. The client reads saved status until completion. Closing the page does not discard the claimed job; an interrupted job can be retried after its three-minute lease.
4. Review the full Chinese/original comparison and bilingual preview PDF. Unconfirmed translations can be regenerated. Missing or incomplete output is never treated as complete.
5. Tick the source/translation review acknowledgement and confirm. The server rechecks the current source under a report-row lock, then stores the three PDF snapshots with the confirmed edition.
6. Download bilingual, Chinese or full original. Repeated confirmed downloads reuse the stored bytes and do not call AI. Continue the existing academic approval, sharing and delivery process; language confirmation does not grant delivery approval or send a message.

Academic users can enter through Parent bilingual report in the original admin report lists. Existing authenticated report PDF routes and Mini Program PDF links use the new complete renderer. Without a matching confirmed translation, they return the complete original in English-labelled layout. Existing valid final-report share links display the matching confirmed translation; invalid/expired/revoked links retain their existing denial behavior. Teacher internal notes remain private.

## Engineering boundaries

- New `LearningReportParentEdition`: kind/report/source hash, immutable public source snapshot, translated content and evidence-keyed summary, generation token/lease/status, model, actor, review state and three PDF byte snapshots. Unique source version prevents duplicate model calls. Report foreign keys and kind/ID check constraints prevent orphaned or cross-kind artifacts; deletion cascades.
- Three additive migrations create the edition table, add PDF columns and enforce report relations. The only backfill affects the new edition table itself, which starts empty in production. No report, grade, attendance, package, payroll, invoice or receipt migration.
- Standard `ops/server/scripts/deploy_app.sh` carries the three report AI variables from the ignored deployment environment into runtime `.env`, so a later release does not silently remove the configured service. Shell syntax checked with `bash -n`.
- The source hash includes the canonical parent-visible fields and relevant report metadata/attendance; it excludes volatile share-view counts and internal final notes. A changed original cannot reuse or confirm an old translation. Completed edition bytes are not overwritten by regeneration.
- JSON generation uses the existing organization Singapore Qwen workspace with report-scoped environment names. Requests contain only parent-visible report fields, not profile/finance records or final internal notes. Any name already inside a teacher comment remains part of that original text. Endpoint configuration is restricted to Singapore HTTPS provider URLs.
- The model receives teacher text as untrusted data with no tools. Contextual translation instructions preserve strengths, difficulties, uncertainty and target-versus-achieved distinctions; prohibit invented scores, diagnoses, deadlines, practice duration, admissions predictions or commitments. Field coverage, nonempty Chinese output, exact numeric/CEFR tokens, evidence keys and completion status are checked in code. These checks cannot prove semantic fidelity, so source comparison and explicit human confirmation remain necessary.
- Long-model requests use non-thinking structured JSON mode verified against the actual configured model, a 120-second call timeout and a three-minute token-guarded generation lease. Failure is stored safely and retry reuses the same source edition. Late work cannot overwrite a newer generation token.
- New mutation endpoints enforce session access, assigned-teacher ownership or authorized academic/admin scope, observer read-only mode, same-origin POST and review acknowledgement. Finance alone and other teachers are denied. New API routes expose safe error codes, never provider credentials or raw exception details.

## Verification

- `npx tsx --no-cache --test tests/*.test.ts`: 818 tests passed.
- `npm run build`: production build passed.
- `scripts/qa/learning-report-parent-uat.ts`, guarded to 127.0.0.1:55439 / sgt_staff_feedback_test: one concurrent model call; deferred execution; cached reuse; unconfirmed regeneration; confirmed frozen PDF bytes; source-edit invalidation; stale review rejection; provider failure/retry; edits during generation not published; deletion cascades.
- Real Singapore model test: full 29-field supplied report, validated translations and evidence-linked summary; three complete language PDFs. Long report revealed an unnecessary thinking-mode timeout; non-thinking mode was tested on the actual model and the full report then passed.
- PDF QA: all source values and translations extracted and checked, no Full text markers, portrait pages rendered and inspected. Representative generated report has 4 Chinese pages, 5 original-language pages and 6 bilingual pages; page counts vary with content.
- Isolated HTTP with real sessions: assigned teacher/admin read; other teacher/finance/anonymous denied; cross-origin write denied; translation PDF blocked before confirmation; preview available; acknowledgement required; three confirmed downloads byte-identical; valid share shows Chinese and invalid token does not expose the student; internal-note marker absent.
- Actual teacher browser: edited a family-facing comment, saved/submitted/generated through the new button, observed generation and full comparison, checked acknowledgement and confirmed; downloads became available.
- Asynchronous HTTP acceptance: generation returns 202 before model completion; status eventually READY; retry and confirmation reuse the current edition. Final evidence retained under local task acceptance artifacts.
- Server report-only AI connection check returned HTTP 200 with the configured model before release; no student report or database record was used for that connection probe.

## Production boundary and acceptance

Before deployment, four existing midterm records for the relevant student were read only and source-digested. Repeat after deployment to verify unchanged source content/status. No live report generation, translation confirmation, approval, sharing, financial mutation or parent notification is used as a production test. New parent-edition table is expected to remain empty until an authorized staff action.

Production completion requires standard release commit equality, PM2 online and HTTP 200, plus the read-only source comparison and schema/AI configuration check. Guarded release output is authoritative.

## Files and guidance

Core: `lib/learning-report-parent-{content,ai,editions,access,pdf}.ts`, the two parent report UI components, the assigned-teacher API routes, teacher forms/admin entry points, existing PDF response builders, parent final-report read view and schema/migrations. User guide: `docs/guides/parent-report-workflow-20261102.pdf`.

Provider references used for request shape: [Alibaba structured output](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output), [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after). Installed Next.js 15.5.26 exports after; actual model compatibility is verified rather than inferred from an alias name.

Rollback: application commit 2d138b134e32981ef994fa04323e9b8476548ab8. Preserve new snapshot tables and stored PDFs; do not drop report history as part of a code rollback.
