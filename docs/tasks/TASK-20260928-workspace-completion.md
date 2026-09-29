# SGT Manage complete workspace remediation

## Authorisation and plan

The owner requested a complete implementation plan and continuous execution through final integrated review, without stage-by-stage approval. Preserve Full Care, School Applications and Next-month Scheduling. Changed interfaces must support Chinese and English with the existing bilingual option. This extends the r407 presentation work in the original SGT Manage; it is not the separate AI OS project.

Authoritative plan: `/Users/zhao111/Documents/sgt系统/交付文件/20260928-流程与页面审查/整体整改执行规划.md`.
Execution ledger: same directory, `整改执行台账.json`. Follow phases 1–10; never mark the whole project complete because one component passes.

## Current implementation checkpoint: cancellation ledger evidence

- Existing ticket result verification now reads the actual session ledger within its transaction. Cancellation requires both the charge decision and net ledger to match; a confirmation note cannot override mismatch or missing evidence.
- Individual minute, monthly and group-count packages use their own units. Each package must reconcile separately; credits to another package do not cancel a deduction.
- Shared and historical transactions require explicit student/attendance references or an explicit session student. A current class roster, amount match or current package binding does not prove historical ownership. Ambiguous entries block verification without changing business records.
- Verification audit includes transaction IDs and package net amounts. No attendance, package balance or ledger row is changed by verification.
- Serializable isolation prevents inconsistent multi-query evidence; serialization conflicts return a bilingual refresh/retry message. Existing ticket row locking remains.

## Validation so far

- 16 focused unit tests pass, including unrefunded cancellation, duplicate refunds, cross-package refunds, partial deduction, shared ownership, stale references, monthly/count modes and non-overridable evidence.
- TypeScript and the complete 259-page production build passed after the implementation, including the friendly concurrency error.
- Isolated PostgreSQL UAT passed the existing result-link scenarios (including concurrent duplicate attempts) plus rejection before refund, acceptance after refund, audit evidence, and byte-equivalent package/attendance/ledger snapshots before and after verification.
- Local-only DB: `127.0.0.1:55439/sgt_workspace_completion_test`; all 132 migrations applied to this new database. No production data was imported. Credentials remain in the ignored local `.env`.
- An initial separate-schema attempt exposed historical enum existence checks that assume the public schema. The working test environment uses a separate database, not a shared schema. No production migration changes were made.

## Still pending

Authenticated local HTTP UAT also passed: web and staff Mini Program APIs return expected results and observer writes remain forbidden. The original checkpoint had not been released; see the r408 checkpoint below for current validation. Remaining phase 1 items (attendance change impact, renewal risk/completion, approval scope) and all later project stages remain pending. This checkpoint is not final project acceptance or a production release claim.

## 2026-09-28 r408 checkpoint: close alternate cancellation completion paths

The common ticket-action writer now verifies cancellation evidence too, including the Mini Program path and legacy tickets without structured actions. Audit results retain the evidence. Direct web cancellation validates student and ticket scope, moves attendance reads into its serializable transaction, and reconciles the resulting ledger before commit, even when no work order is linked. An error rolls back the attendance and any deduction/refund together. The operation does not guess ownership of legacy/shared entries.

Local HTTP UAT proves foreign-student rejection, no state changes for a stale attendance counter, exactly one rollback under concurrent and repeated cancellation, and existing result linking/observer restrictions. The service UAT proves the central completion helper also rejects outstanding debits. All fixtures are confined to the named isolated database.

The verification area and submit button use the current language preference. The attendance-only label now says uncharged leave is recorded and actual ledger verification is still required. Authenticated browser checks passed for Chinese, English and bilingual verification text/buttons and the rendered bilingual layout. The English browser workflow rejects a falsely completed cancellation with an outstanding debit. Full-ticket language coverage remains phase 8; these changes do not claim that old Chinese-only sections are translated.

Validation: 41 focused cancellation, payroll-unit and ticket-action tests; isolated service and HTTP UAT; TypeScript/259-page production build. Guarded deployment and exact version/PM2/health evidence are recorded in the external execution ledger after release. Production data has not been changed for testing.

Remaining phase 1 work: renewal risk resolution versus verified renewal completion; attendance change impact; financial approval coverage. Later phases remain pending. The existing direct web route does not gain monthly/count correction capability in this release; a mismatch remains blocked for the existing appropriate administrative workflow.

## 2026-09-28 r409 checkpoint: risk resolution is not renewal completion

Automatic scans use a distinct RISK_RESOLVED outcome for early reminders when the source package is active and no risk remains. Confirmed renewal and financial workflow stages remain open. A current contract created during the task or already linked to it also prevents automatic closure; signing with safe hours still yields PAYMENT_PENDING, not payment confirmation. Void/expired contracts are excluded from forecast advancement.

Risk-free snapshots refresh the balance, scheduled usage and forecasts on retained financial tasks, so the UI does not show the old shortage. Inactive source packages use a separate risk display. Earlier task notes are retained. Auto-resolution and its audit are in one transaction, guarded by the task update version. A new shortage is not snoozed by a prior risk resolution and creates a separate follow-up. Historical completed tasks are not rewritten.

Published Mini Program clients have a fixed picker: their GET response uses PAUSED_SPECIAL for the picker only, with the correct statusLabel and canonicalStatus=RISK_RESOLVED. Metadata-only PATCH requests from that endpoint map the legacy value back to RISK_RESOLVED; manually turning another task into RISK_RESOLVED or reopening a resolved history is rejected. This is an explicit compatibility projection, not a database status migration or Mini Program client release.

Validation: 12 focused tests; isolated database UAT for concurrent scans, one audit, retained finance stages, newly signed/unpaid renewal, unchanged business packages/history, new shortage task, and legacy metadata updates; isolated HTTP Mini Program GET/PATCH and observer rejection. Build and browser language checks are recorded before release. Production verification remains a guarded release check only; no production scan is invoked as a test.

Remaining phase 1: manual PAYMENT_CONFIRMED/PACKAGE_ACTIVE transitions still require actual receipt/entitlement evidence. Actual direct-customer invoices/receipts live in parent_billing_v1; approval status lives in parent_receipt_approval_v1 and uses getReceiptApprovalStatus. Signed renewal hours use PURCHASE ledger notes with student-contract-renewal-topup:<contractId>; signing itself can add hours before payment, so an active balance alone is not payment evidence. Preserve partner settlement terms rather than assuming every partner must prepay. The older date-time-local input also slices UTC text directly and needs correction with the language/UI pass.

## r410 — Approval inbox coverage

- Verified `lib/approval-inbox.ts`: only pending package invoice approvals, non-rejected pending parent/partner receipts, confirmed teacher payroll awaiting approval/finance/payout, and submitted expense claims are integrated. HR leave/payslips and partner settlement approval use separate sources.
- Added a collapsed three-language coverage guide with current account visibility using existing server flags. No visibility or approval policy changes. Empty-state guidance explains missing drafts/rejections/out-of-scope workflows; “No risk” becomes “No listed warning”.
- Fixed explicit all-inbox navigation (`focus=all`) so the saved focus cookie cannot silently keep the user in a previous lane after clicking All.
- Local production build and browser verification are recorded in the external execution ledger. No production approval action is used for testing.
- Overall phase 1 remains open: manual renewal payment/entitlement evidence, attendance-impact guidance, and cross-role regression are still required.

- Final verification: complete 259-page production build passed (`/tmp/sgt-r410-build-final.log`); authenticated isolated browser passed ZH/EN/BILINGUAL coverage/empty-state display, collapsed guide, native manager→all navigation and remembered-manager→return-to-full-inbox navigation. No console errors observed. Language preference persistence was verified after reload; the existing client refresh inconsistency is retained for the broader UI pass.
- Native navigation is opt-in for the two approval banners; every other shared banner retains its existing default. No new business records or approvals were created for this UI check.

## r411 — Dependency security patches and self-service route coverage

- Audit found Next.js/sharp/nanoid advisory ranges. Patched to Next 15.5.26, sharp 0.35.4 and nanoid 3.3.18, keeping Next's sharp deduplicated on the patched version and retaining the existing PostCSS override. Official AVIF and nanoid advisories were checked; no exploitation claim is made.
- Installed independent dependencies in this worktree after removing only its verified symlink. Shared ai-subdomain dependencies remain untouched.
- Backend suite originally had 180/181 passing due to `/staff/hr` missing from the operation-flow registry. Added the exact existing self-service route to the existing SYSTEM_GUIDE staff workbench area, then reran: 181/181 pass. No test assertion was removed and no dedicated HR training completion is claimed.
- 12 focused cancellation/renewal tests, isolated renewal service UAT and normal PNG/JPEG/WebP/AVIF decoding/resizing pass. Audit is zero. Logs: `/tmp/sgt-r411-backend-final.log`, `/tmp/sgt-r411-remediation.log`, `/tmp/sgt-r411-renewal-uat.log`, `/tmp/sgt-r411-audit.json`.
- The separate navigation-performance source test remains a known pre-existing failure: ticket AI work is currently awaited before secondary queries. Investigated in `/tmp/sgt-navigation-baseline.log`; fix the actual parallelism later rather than relaxing the assertion.
- Full programme remains in progress; dependency remediation is an early phase-9 subtask while phase-1 financial evidence and attendance-impact work continue next.

- Final local validation: 259-page Next 15.5.26 production build passed (`/tmp/sgt-r411-build-final.log`); isolated renewal HTTP UAT passed (`/tmp/sgt-r411-renewal-http.log`); actual Next Image endpoint returned HTTP 200 image/webp and decoded at width 256; authenticated approval page rendered without console errors. Existing language preference/router.refresh stale-display behavior remains reproducible; native reload displays the persisted language and this pre-existing issue remains on the UI ledger.

## r412 — Manual renewal payment evidence

The shared web/Mini Program writer now verifies exact invoice ownership and approved receipts before entering PAYMENT_CONFIRMED, or direct-customer PACKAGE_ACTIVE. Partner postpaid activation retains its existing meaning without setting a payment timestamp. Payment evidence, status and audit are atomic; the new optional database arguments in billing/approval readers keep evidence within the same transaction snapshot. Old completed tasks are not rewritten and note-only edits preserve their completion time.

Read-only production aggregates: 16 open tasks; 8 use partner postpaid settlement; 4 have linked parent invoices, all issued before their task creation. Accordingly an older invoice is not automatically invalid: staff must explicitly record the checked contract/billing basis for this renewal in the web evidence panel. Missing dates, duplicate IDs and unrelated ownership remain blocked. Audited prior use prevents the same proof being assigned to another renewal cycle even after later task-link edits. No automatic matching by name or amount.

Validation: 17 focused policy/renewal tests and 181 backend tests passed. Guarded isolated UAT covers full/partial/pending/rejected receipts, foreign student, old/missing dates, duplicate invoices/receipts, operations-role restriction, concurrent updates, audit-insertion failure rollback, historical note-only edits, reuse prevention, older-invoice explicit review and live/reverted partner settlements. Package and ledger snapshots remain unchanged. Script: `scripts/qa/renewal-payment-uat.ts`; logs `/tmp/sgt-r412-uat.log` and `/tmp/sgt-r412-backend.log`. The UAT restores its isolated AppSetting snapshots; no production business tests are run.

Remaining: actual new-purchase/renewal entitlement evidence (hours vs monthly validity), attendance impact and all later programme phases. This payment checkpoint must not be described as verified entitlement activation or overall completion.

Final r412 local verification: 259-page build passed (`/tmp/sgt-r412-build-final.log`); focused 17/17 and backend 181/181 pass. Isolated payment HTTP UAT (`/tmp/sgt-r412-http.log`) and renewal risk/observer Mini Program regression (`/tmp/sgt-r412-risk-http.log`) pass. Authenticated browser checked EN/ZH/BILINGUAL collapsed/expanded payment evidence, invoice selection, approved totals and historical review field. Web save rejected an older invoice without review; after explicit review it saved PAYMENT_CONFIRMED with an audit. Browser error log empty; bilingual layout inspected. Existing language selector still needs a native reload to consistently refresh all server-rendered content; that pre-existing UI issue remains on the programme ledger.

## r413 — Keep the reviewed invoice through later risk scans

Inspection of the next entitlement checkpoint found that the forecast refresh still assigned latest contract/invoice IDs over existing task selections. Scans now preserve an explicit invoice or verified-payment link, including a manual invoice without a contract. A currently linked contract may gain its subsequently issued invoice only when the forecast contract ID matches. Unlinked tasks still discover contracts. The same policy applies to shortage and safe-hours scan paths.

Validation includes pure linkage cases and isolated PostgreSQL concurrent scans proving that manual selections survive both paths. The test also proves discovery still works for a newly signed contract on an unlinked task. No production scan is triggered during acceptance. Entitlement activation evidence remains the next phase1 item.

Final r413 local validation: 19 focused tests, isolated concurrent risk-scan UAT, complete payment evidence UAT, 259-page build and existing legacy Mini Program/observer HTTP regression passed. Logs: `/tmp/sgt-r413-focused.log`, `/tmp/sgt-r413-uat.log`, `/tmp/sgt-r413-payment-uat.log`, `/tmp/sgt-r413-build.log`, `/tmp/sgt-r413-http.log`. No UI changes in this checkpoint.

## r414 — Verify actual renewal entitlements

- Release ID: `2026-09-28-r414`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; exact guarded-release evidence is recorded in the external execution ledger.
- Problem: renewal follow-up could claim PACKAGE_ACTIVE after payment verification without proving an actual purchase or period extension.
- Change: activation verifies exact student, course, package type, units, settlement terms, active validity and finance gate. It requires actual PURCHASE rows or an audited monthly extension. Contract top-up markers must reference a live signed renewal with matching quantity and invoice. Manual/earlier purchases and extensions require explicit scope-review evidence; uncertain shared ownership is not inferred.
- Reuse/correction: previously verified evidence is retained in immutable audit history and cannot complete another task. Later negative non-deduction corrections block automatic attribution. Serializable status/evidence/audit writes are atomic; no package balances or ledger rows are changed by verification. Partner postpaid activation still does not assert cash received.
- Monthly packages: the existing package edit transaction now records date changes under a row lock. Only actual extensions matching current dates qualify. Historical edits without structured evidence remain pending review. New monthly packages use their zero-minute initial purchase; counts never become hours.
- UI: collapsed ZH/EN/BILINGUAL entitlement review, exact target-package/contract selection, coordinated invoice preview, selectable purchase records and review basis. Explicitly clearing a stale reference differs from omitting it; historical note-only updates preserve old closure records. Existing web/Mini Program access remains.
- Validation: 26 focused tests, 181 backend tests, isolated PostgreSQL payment/risk/entitlement UAT, audit failure rollback, concurrent duplicate prevention, invalid contract/quantity/invoice/ownership, count and monthly scenarios, unchanged ledger/balance snapshots, Mini Program HTTP rejection/success, authenticated browser in three language modes, 259-page final build. Browser rejected missing review then accepted reviewed purchase; console errors empty.
- Live read-only aggregate: 16 open tasks, 0 monthly packages, 2 shared packages; associated packages have 6 contract-marked and 31 manual PURCHASE records. No production business writes or scans used for testing.
- Remaining: attendance-change impact, unit-aware forecast truth and phases2–10. This is not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `94f687fc3914033fdcaa378b0dfcfcde9441aeb8` (r413). No schema migration.

---


Evidence logs: `/tmp/sgt-r414-focused.log`, `/tmp/sgt-r414-backend.log`, `/tmp/sgt-r414-build-final.log`, `/tmp/sgt-r414-entitlement-uat.log`, `/tmp/sgt-r414-entitlement-http.log`, `/tmp/sgt-r414-payment-uat.log`, `/tmp/sgt-r414-http.log`, `/tmp/sgt-r414-risk.log`. All intentional failure fixtures run only against 127.0.0.1:55439/sgt_workspace_completion_test. Monthly date auditing is within the existing package-edit transaction; no backfill is invented. The pre-existing language-selector refresh issue and incomplete legacy page translations remain for phase8.

## r415 — Net teaching consumption for renewal forecasts

- Release ID: `2026-09-28-r415`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded-release verification is recorded externally.
- Problem: renewal forecasts summed every recent negative transaction, treating entitlement corrections as teaching consumption and ignoring refunds. A refund posted now for an older lesson could distort the current consumption window.
- Change: pair DEDUCT/ROLLBACK by exact package and lesson using the full ledger, then apply the last-28-day lesson-date window. Unlinked rights ADJUST and PURCHASE are excluded. Paired historical deleted lessons with zero net usage do not inflate consumption; unresolved missing lessons, invalid signs, over-refunds and lesson-linked ADJUST remain REVIEW.
- Workflow: uncertain usage cannot automatically close a renewal risk or produce a depletion date. REVIEW remains open and can create a separate task despite an old completion's snooze; old completion history is preserved. No payment or new-rights claim is made. Renewal message preparation displays a reconciliation instruction instead of a consumption claim.
- UI/API: ZH/EN/BILINGUAL review badge, explanation and withheld web consumption. Published Mini Program clients receive a readable risk warning and canonical REVIEW field; no WeChat client package is released. Older client numeric formatting remains a separately tracked limitation, so web is the review surface.
- Production read-only scope: 50 active forecast packages; 1,571 DEDUCT/ROLLBACK/ADJUST rows; 1,518 referenced lessons; 7 rows reference missing lessons; 0 recent unlinked deduction/rollback and 0 recent lesson adjustments. No production business writes or scans were used as tests.
- Validation: 20 focused tests, 181 backend tests, isolated PostgreSQL exact-net/cross-window/orphan/snooze regression, no package/ledger writes during scanning, legacy Mini Program HTTP, three-language authenticated browser and empty browser error log. Full 259-page build recorded before release.
- Remaining: future schedule allocation, charged leave/waivers, count-versus-minute/monthly forecasts, attendance-change impact and programme phases2–10. Not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `144001238633ef35c0ef2de62be289b674fec3d4` (r414). No schema migration.

---


Logs: `/tmp/sgt-r415-focused.log`, `/tmp/sgt-r415-backend.log`, `/tmp/sgt-r415-uat-final.log`, `/tmp/sgt-r415-risk-uat.log`, `/tmp/sgt-r415-http.log`, `/tmp/sgt-r415-build-final.log`. Isolated UAT asserts a verified 45-unit weekly net from two recent lessons, ignores an old-lesson refund and a 3,000-unit rights correction, keeps an orphan debit pending, resolves only after pairing, and does not rewrite an old completed task when a new review is needed.

## 2026-09-28-r416

- Release ID: `2026-09-28-r416`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded-release proof is recorded in the external execution ledger.
- Problem: renewal forecasts compared count entitlements to lesson minutes, treated monthly zero-minute fields as depleted, and counted free leave, waived or already charged future lessons. Multiple eligible packages could each be assigned the same lesson.
- Change: persist a versioned, unit-aware forecast snapshot (MINUTES / COUNT / PERIOD). Count shared group demand per student; monthly packages use expiry. Exact session student overrides class membership. Free leave and waivers consume no forecast units; already charged lessons require matching actual ledger evidence. Missing/ambiguous/invalid package bindings remain REVIEW rather than being guessed. Fractional weekly count usage is retained.
- History/UI: existing completion snapshots are not backfilled or reinterpreted; original raw values remain in a collapsed unit-unverified view. New display is ZH/EN/BILINGUAL. Published Mini Program API preserves numeric shape and adds an explicit count-package warning directing staff to web; this is not a WeChat client release.
- Schema: one nullable JSONB column, RenewalTask.forecastSnapshot, no historical data rewrite. Applied to isolated PostgreSQL and generated client before testing.
- Validation: 27 initial focused tests plus 21 final targeted checks including invalid binding, 181 backend tests, 259-page final build; isolated shared-count/charged-leave/waiver/precharge mismatch/monthly/multiple-package UAT and actual Mini Program HTTP; count display 10 / 2 / 0.25 in ZH/EN/BILINGUAL, historical unit-unverified display, browser console clean. Scans leave package/ledger snapshots unchanged.
- Production read-only aggregate: 50 active packages, 0 monthly, 0 count packages, 261 upcoming lessons. All mutation scenarios use isolated fake data.
- Remaining: attendance-change impact and phases2–10; legacy global language refresh, older untranslated controls and Mini Program formatting remain tracked. Not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `ec3ca4e746c0132596c054abb396a036f485d32b` (r415). Keep the additive nullable column on application rollback; do not drop preserved snapshots.

---

Logs: `/tmp/sgt-r416-focused.log`, `/tmp/sgt-r416-focused-final.log`, `/tmp/sgt-r416-backend.log`, `/tmp/sgt-r416-build-final.log`, `/tmp/sgt-r416-units-http.log`, `/tmp/sgt-r416-consumption.log`, `/tmp/sgt-r416-risk.log`. A final review added a regression for invalid explicit bindings: no matching package now marks the relevant available scope REVIEW, instead of making it silently safe.

## 2026-09-28-r417

- Release ID: `2026-09-28-r417`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; exact guarded-release evidence is recorded externally.
- Problem: both teacher attendance endpoints copied previously read package/deduction fields back into an update. A concurrent academic correction could be overwritten. A multi-student save or later audit failure could also leave a partial result.
- Change: Web and staff Mini Program now use one transactional factual attendance save. It rechecks teacher ownership/current permitted roster under a session lock, writes only status/note, and commits before/after facts plus a read-only financial impact assessment in the same serializable transaction. Unknown/duplicate/invalid roster submissions fail atomically; a conflicting save asks staff to reload.
- Truth: saving a teacher's observation does not deduct, refund, approve or resolve a ledger discrepancy. Net evidence is compared per exact student and package; ambiguous shared ownership, cross-package refunds, corrections, wrong units, free leave with deductions and unverified teaching remain pending academic review. Counts and monthly packages keep separate semantics. No financial fields, package balance or ledger are written by this path.
- UI/API: Web ZH/EN/BILINGUAL save result distinguishes factual attendance from deduction/refund and shows an academic-review warning when needed. Mini Program keeps its existing rows/savedAt response with additional impact fields; no client package was published, and the existing client toast remains attendance-only.
- Validation: 5 new impact tests plus cancellation evidence regressions, 181 backend tests, isolated PostgreSQL service/HTTP scenarios for facts-only writes, concurrency, invalid/duplicate/foreign roster, authorization, observer denial, transaction/audit rollback and unchanged package/ledger snapshots. Authenticated teacher browser saves in all three language modes show the correct warning with no console errors. 259-page build passed after correcting a missing passwordSalt in an isolated test fixture.
- Remaining: admin financial attendance mutation paths still require review (stale reads, exact package attribution, atomic audit); broader phase4 feedback guidance and phases2–10 remain. This is not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `d937ccf159a655bd403f431235de3171687edf7f` (r416). No schema migration.

---

Logs: `/tmp/sgt-r417-focused-final.log`, `/tmp/sgt-r417-backend.log`, `/tmp/sgt-r417-uat.log`, `/tmp/sgt-r417-http.log`, `/tmp/sgt-r417-build-final.log`. All mutations were run only on 127.0.0.1:55439/sgt_workspace_completion_test. Existing teacher cancellation visibility and roster eligibility are preserved. Existing feedback completion guidance still needs its phase4 semantic review; no teacher observation automatically completes finance.

## 2026-09-28-r418

- Release ID: `2026-09-28-r418`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded-release proof is recorded externally.
- Problem: single and bulk admin attendance paths duplicated deduction logic, read old attendance before their transactions, compared ledger totals across packages and wrote audits after commit. A restored UNMARKED lesson could attempt a second debit; historical unbound debits could be ignored; simultaneous lessons could overspend a shared balance.
- Change: both existing endpoints use one shared financial attendance transaction. Recheck session/roster and existing financial metadata inside a serializable transaction; verify actual ledger attribution per student and package before and after mutation. Stored debits are verified independently of attendance status, so factual corrections reuse the existing debit and free leave refunds it exactly once. Missing/ambiguous historical ownership is blocked for review. Conditional balance updates cannot overspend; audit and all affected records commit or roll back together.
- Compatibility: existing routes, requireAdmin guards, package selection/mode rules and fourth-leave charging rule remain. Bulk group-minute saves now use actual duration. Monthly packages are explicitly rejected by this existing minute/count deduction path, never converted to minutes. Monthly workflow review remains within phase4. No real historical records are repaired automatically.
- Validation: 12 focused evidence/cancellation tests,181 backend tests,full TypeScript and259-page build. Isolated PostgreSQL service and actual authenticated Web HTTP cover restored attendance without duplicate debit, concurrent/repeated free-leave refund once, shared count/minute classes, waived teaching, exact package transfer, monthly rejection without writes, charged fourth leave, orphan shared ownership rejection, transaction/audit rollback and simultaneous lessons competing for one balance. Expected serializable conflict logs are rejected competitors; UAT overall passed.
- Risk: ambiguous historical data now stops for reconciliation instead of silently proceeding. This deliberately cannot infer who owns an old shared debit. Existing non-financial teacher save remains r417. No production mutation acceptance or messages sent.
- Remaining: broader correction preview/teaching interfaces and programme phases2–10. This checkpoint is not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `b354d25c6dd4b7475eadfcb83a0a6b4f473a5855` (r417). No schema migration.

---

Logs: `/tmp/sgt-r418-focused.log`, `/tmp/sgt-r418-backend.log`, `/tmp/sgt-r418-tsc.log`, `/tmp/sgt-r418-uat-final.log`, `/tmp/sgt-r418-http.log`, `/tmp/sgt-r418-build.log`. This also fixes an isolated evidence-test type annotation discovered by full tsc; runtime policy is unchanged. Phase1 safety checkpoint is ready for review; no claim that all downstream workflows or pages are complete.

## 2026-09-28-r419

- Release ID: `2026-09-28-r419`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release evidence is maintained in the execution ledger.
- Problem: original lead records mix contacts, institutions and individual students. One referral source has no persistent profile or independent cooperation-project history; student creation automatically marked a lead Won and could create duplicate students on simultaneous requests.
- Change: add relationship profiles, relationship follow-ups and separate cooperation projects, with owner, status, next action and Singapore follow-up dates. Link original leads only after explicit classification and recorded evidence; existing records default to UNREVIEWED and are never grouped by name. New student opportunities can be created within an exact relationship. Relationship status stays independent of each student's deal. Student creation locks/rechecks the lead, requires student classification, audits atomically and preserves deal status.
- UI: ZH/EN/BILINGUAL relationship list/detail, overdue/archive filters, profile/history sections, independent student rows, explicit legacy-link review and appended classification/link export columns. Original URLs and historical notes remain. Saved-result forms disable pending submissions and open the actual result instead of leaving stale client content.
- Access: use existing ADMIN/SALES/CS/operations-admin resource scope and deny observer writes. Actual HTTP testing exposed that the existing admin login excluded SALES/CS despite their authorized resource workspace; login now uses the existing resource-role predicate. Teacher and finance relationship access remains rejected.
- Evidence: 3 policy tests,181 backend tests,full TypeScript and260-page build; isolated PostgreSQL service/HTTP tests cover three independent referrals, stale/concurrent updates, one follow-up under concurrency, atomic audit rollback, archive/restore/history, wrong-profile project rejection, negative estimate rejection, role guards and unchanged student/ledger during relationship-only operations. Authenticated browser tested Chinese creation/follow-up/project, English linkage, bilingual rendering, exact relationship new lead and one student creation with status still New Lead; console errors empty.
- Migration: additive Lead classification/link columns plus three relationship tables, indexes and foreign keys.134 isolated migrations applied. No real relationships, contracts, receipts or ledger records created by acceptance tests; no inferred historical attribution.
- Remaining: exact existing-student reuse and verified contract/receipt attribution metrics remain in phase2. Existing global language refresh behavior remains in phase8. This is a foundation checkpoint, not overall or phase2 completion.
- Risk: nullable relationship links leave historical records pending review. Estimated project amounts and Won statuses never constitute received money. Rolling application code back can retain the additive schema and new data; do not drop the tables.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `5d78de4ca59a262491b6d7695d8571de0b8d00f7` (r418).

---

Logs: `/tmp/sgt-r419-policy.log`, `/tmp/sgt-r419-backend-final.log`, `/tmp/sgt-r419-uat.log`, `/tmp/sgt-r419-http-final.log`, `/tmp/sgt-r419-build-final.log`. Initial HTTP UAT correctly found the existing SALES/CS login mismatch; final five-role HTTP acceptance passed after the targeted fix. Initial build type issue in the UAT role fixture was fixed; final build passed.

## 2026-09-28-r420

- Release ID: `2026-09-28-r420`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded-release proof is recorded in the execution ledger.
- Problem: a referred student who already exists could only be created again through lead handoff. Names alone are not reliable identity evidence. The new relationship path also needed registration in the restricted operations-admin route whitelist.
- Change: administrator handoff now offers exact existing-student selection or explicit new creation. Search returns separate profiles with full IDs, grade and school; linking requires a written identity check. A serializable lead lock protects creation/linking, checks classification/version/archive state, rejects a conflicting previously linked student and commits the audit atomically. Repeated completed requests reuse the same exact student.
- Preservation: linking does not edit the existing student's profile, source, notes, packages or history. Lead pipeline status and latest follow-up summary remain unchanged; no automatic Won/payment confirmation. No name-based merge or historical relinking.
- Access/UI: existing resource-admin/operations-admin handoff permissions, observer denial and ZH/EN/BILINGUAL controls. Relationship routes are available to restricted operations administrators; company finance and package top-up remain blocked. Saved results open the exact student profile; original lead URLs remain.
- Verification: 12 focused relationship/operations-access tests,181 backend tests,full TypeScript and260-page final build. Isolated service UAT covers same-name distinct profiles, exact ID, required review, stale state, different-student rejection, two leads reusing one student, archived/unreviewed rejection, role denial, concurrent new creation once, audit rollback and unchanged package/ledger counts. Six-role authenticated HTTP verifies resource and operations access plus finance/teacher/observer boundaries. Browser checks all three languages, searches three same-name fixtures, links grade1 by exact ID, returns to the existing student and confirms only one audit with Contacted status and original summary/profile retained. Console errors empty.
- Remaining: phase2 financial document attribution and verified contract/receipt metrics remain in progress. This checkpoint does not complete the programme.
- Risk: uncertain identity requires staff review; this feature does not migrate or merge existing records. No schema migration and no production business acceptance writes.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `f373f1894ef0eb7eda479edb93d8cd1bcd5bf479` (r419).

---

Logs: `/tmp/sgt-r420-focused.log`, `/tmp/sgt-r420-backend.log`, `/tmp/sgt-r420-uat.log`, `/tmp/sgt-r420-http.log`, `/tmp/sgt-r420-build-final.log`. All fixtures are isolated at127.0.0.1:55439/sgt_workspace_completion_test.

## 2026-09-28-r421

- Release ID: `2026-09-28-r421`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release evidence is recorded in the execution ledger.
- Problem: linked students and Won deals do not prove which relationship generated a signed contract. Automatically counting all contracts for a student would attribute unrelated or historical business and could count the same contract twice.
- Change: full administrators can explicitly attribute an exact student contract to a student opportunity with a written review basis, or revoke attribution without changing the contract. Unique document ownership, serializable source/lead locks, optimistic source/version checks and atomic before/after audits prevent conflicting or duplicate attribution. The reviewed relationship-link revision is preserved; relinking a lead makes its prior evidence pending review instead of silently moving it.
- Evidence truth: signed count requires current SIGNED/INVOICE_CREATED status plus a signature date, excludes void/expired documents, and leaves conflicting/missing evidence pending review. Revocation retains history. Student handoff and sales status never constitute payment. Receipt attribution remains a separate pending phase2 item and is explicitly identified as unavailable in this panel.
- UI/access: collapsed lead and relationship panels in ZH/EN/BILINGUAL, exact contract IDs and original contract-history links, manual review and soft revocation. Queries and writes are restricted to existing unrestricted ADMIN scope; SALES/CS/operations admins receive no contract evidence payload, FINANCE/teachers retain existing resource restrictions, observers read only.
- Validation:16 focused tests,181 backend tests,full TypeScript and260-page build; isolated PostgreSQL tests cover exact student rejection, stale source/lead, concurrent document uniqueness, idempotence, forced transaction rollback, relationship moves and explicit rereview, revoke/reactivation, current void exclusion and unchanged contract/package/ledger/billing/approval snapshots during attribution. Seven-role authenticated HTTP verifies data visibility and read-only observer boundaries. Actual browser saved one attribution in English, revoked only attribution in Chinese, verified bilingual relationship history and unchanged signed source contract; one attach/one revoke audit, no console errors.
- Production investigation: read-only aggregates show38 contracts (27 INVOICE_CREATED,1 SIGNED,7 VOID,2 CONTRACT_DRAFT,1 INTAKE_PENDING),zero signed statuses without signature dates,zero relationship profiles. No automatic history backfill or production business fixtures.
- Migration: additive SalesEvidenceAssignment table and nullable relationship-link revision, two additive migrations (136 isolated migrations total). No business documents, permissions, money, lessons or balances are changed by migration. Keep additive schema/data if application code is rolled back.
- Remaining: approved receipt/invoice attribution, relationship comparisons, remaining phase2 acceptance and phases3–10; not programme completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `011d685f7dc93ef040d2016d250afaec11dfb41e` (r420).

---

Logs: `/tmp/sgt-r421-focused.log`, `/tmp/sgt-r421-backend.log`, `/tmp/sgt-r421-uat.log`, `/tmp/sgt-r421-http.log`, `/tmp/sgt-r421-build.log`, `/tmp/sgt-r421-tsc-final.log`. An initial missing schema revision field was corrected with the second additive migration; final UAT/type/build checks passed. Expected serializable conflict is a rejected competing attribution.

## 2026-09-28-r422

- Release ID: `2026-09-28-r422`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: a signed contract or a Won deal cannot prove collected money. Parent invoices and approved receipts were not explicitly attributed to referral relationships; legacy readers silently replace malformed amounts, and a contract and its invoice could otherwise be attributed to different leads.
- Change: exact parent-invoice attribution requires the linked student, verified package ownership, current invoice fingerprint and written referral evidence. Unique document ownership, serializable lead/billing locks, current source checks and atomic audits protect retries, conflicts and reversals. A changed invoice or lead relationship returns to REVIEW; deleted/revoked evidence is excluded. Contract and invoice attribution reject competing lead ownership in both directions, including simultaneous attempts and current read-time contradictions.
- Financial truth: strict raw billing/approval parsing, finite integer-cent amounts, duplicate IDs, exact receipt student/package scope and existing finance approver rules. Only currently approved, non-rejected receipt amounts count; pending/rejected receipts are separately counted. Missing or malformed evidence yields REVIEW, not an invented zero. These are approved receipt amounts, not net revenue after refunds. No invoice, receipt, approval, package, ledger or source contract is changed by attribution/revocation.
- UI/access: collapsed parent invoice/receipt sections on lead and relationship pages, exact invoice selection and original billing links, ZH/EN/BILINGUAL review/revocation/result messages. Existing unrestricted ADMIN financial scope; no financial IDs, notes or totals serialized to SALES/CS/operations administrators. Observers read only; finance/teacher resource restrictions preserved.
- Validation:10 focused policy tests,181 backend tests,full TypeScript and260-page production build. Isolated service tests cover partial/pending/rejected receipts, malformed/duplicate financial evidence, changed-invoice rereview, shared ownership, unique/concurrent attribution, cross-contract/invoice races, audit rollback, source preservation and live conflict detection. Seven-role authenticated HTTP checks visibility and observer boundaries. Browser EN attributed SGD109 invoice with SGD50 approved receipts, ZH revoked attribution only, BILINGUAL relationship view retained revocation history and excluded its totals. Exactly one browser attach/one revoke audit; source invoice, receipt and Contacted pipeline unchanged; console clean.
- Investigation: read-only production check found62 parent invoices,valid receipt amounts and approver arrays,zero existing attributions. One historical invoice RGT-202605-0003 has amount163.20, GST0 and total4896; the current workflow defaults total to amount+GST, so this historical amount basis remains REVIEW rather than guessing or rewriting it. No production business test records.
- Migration: nullable sourceFingerprint on SalesEvidenceAssignment, one additive migration (137 isolated migrations total). Existing contract evidence remains compatible; retain schema/data on application rollback.
- Remaining: partner invoice/credit-note attribution (including manual/consolidated records that require review), relationship comparisons and remaining phase2 acceptance; phases3–10 continue. This release is not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `85b2ec34f9308b55bc021bb11251f62b4ef914b9` (r421).

---

Logs: `/tmp/sgt-r422-focused.log`, `/tmp/sgt-r422-backend.log`, `/tmp/sgt-r422-uat.log`, `/tmp/sgt-r422-http.log`, `/tmp/sgt-r422-build.log`, `/tmp/sgt-r422-tsc-final.log`, `/tmp/sgt-r422-migrate.log`. All write acceptance used127.0.0.1:55439/sgt_workspace_completion_test. No real communications or financial operations performed.

## 2026-09-28-r423

- Release ID: `2026-09-28-r423`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: referral reporting lacked partner invoices, current approved receipts and issued credits. Partner billing contains unit-price lines and monthly summary lines; treating these as ordinary full line amounts or allocating consolidated invoices by name would misstate business.
- Change: explicit exact-student/partner settlement evidence attribution with invoice fingerprints, serializable uniqueness, optimistic lead checks, atomic review audits and reversible attribution history. Existing monthly summary invoices are supported only when all actual settlements belong to the exact student, partner and month and sum to the recorded line base. Unknown partners, manual/unbound lines, mixed students, reverted/missing settlements or inconsistent amounts remain REVIEW without guessed allocation.
- Financial truth: original invoice, issued credit and adjusted invoice totals are separate. Approved receipt amounts use actual recorded amounts and current approval rules; credits are not subtracted from receipts a second time and do not establish a cash refund. Voided/draft credits are excluded. Attribution/revocation changes no invoice, receipt, credit, settlement, ledger, package, pipeline status or approval.
- UI/access: reuse collapsed invoice panels on lead and relationship pages in ZH/EN/BILINGUAL, with exact partner invoice selection and original billing links. Unassigned partner invoice count is explicitly company-wide, not attributed to the viewed relationship. Existing full ADMIN financial permissions and observer read-only behavior retained; no financial payload for SALES/CS/operations admins.
- Validation:16 focused policy tests,181 backend tests,full TypeScript and260-page production build. Isolated partner service UAT covers competing ownership/idempotence, atomic rollback, stale lead/hash, source reversal and credit changes, revocation/reactivation, disabled mixed/unresolved candidates and unchanged source snapshots. Parent-invoice service regression passes after shared receipt evaluation extraction. Seven-role HTTP passed. Actual browser EN attach and ZH revoke each audited exactly once; bilingual relationship shows original109, issued credit21.80, adjusted87.20, approved receipts50 and retained revoked history. Browser console clean; no production write fixtures.
- Investigation: production read-only aggregate found13 partner invoices. Ten have no partner ID; three monthly invoices cover4/4/6 students. One issued credit exists. Historical attribution remains reviewable in Finance; no history is automatically repaired, merged or split.
- Migration: none. Existing generic evidence table and source fingerprints reused.
- Remaining: relationship comparisons and phase2 full acceptance; phases3–10 continue. Not overall completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `92a0077255b193115d85a124803e7eeadaf0a3c2` (r422).

---

Logs: `/tmp/sgt-r423-focused.log`, `/tmp/sgt-r423-backend.log`, `/tmp/sgt-r423-uat.log`, `/tmp/sgt-r423-parent-regression.log`, `/tmp/sgt-r423-http.log`, `/tmp/sgt-r423-build.log`, `/tmp/sgt-r423-tsc-final.log`. Isolated database guard checks both connection URLs. Expected competing transaction rejection in parent regression is intentional. Browser initially waited for a nonexistent separate revoke banner; actual shared success banner plus persisted revoked history and audit verified the operation.

## 2026-09-28-r424

- Release ID: `2026-09-28-r424`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release evidence is maintained in the execution ledger.
- Problem: relationship cards counted all linked records as a single number and the due filter only considered the relationship's own date, hiding overdue student and project work. Managers had no side-by-side comparison of reviewed business evidence.
- Change: optional comparison view separates student opportunities, exact-ID distinct linked students, open student deals, independent cooperation projects, verified signed contracts and currently approved parent/partner receipts. Shared existing evidence readers batch the displayed relationship IDs; comparison and detail values follow identical current-source rules. Missing verified receipt evidence is shown as unverified, not zero business; parent/partner channels remain separate and neither is labeled net revenue.
- Follow-up: due filtering includes the relationship, active student deals and active cooperation projects independently. Won/lost/archived student records, unreviewed contact records and closed/paused projects do not create child deadlines. A won student never clears relationship follow-up. Cards and comparison show due task counts by scope; optional sorting applies to displayed results, with an explicit 200-result coverage limit.
- Access/UI: ZH/EN/BILINGUAL, card view remains default, comparison is opt-in, old URLs and workflow actions remain. Financial queries/payloads are absent for SALES/CS/operations-admin users; observers retain read-only access and FINANCE/teacher resource restrictions remain.
- Validation:22 focused policy tests,181 backend tests,full TypeScript and260-page build. Isolated comparison UAT matches every relationship detail, guards both DB URLs, checks financial role boundaries and unchanged billing/approval/assignment/ledger snapshots. Seven-role HTTP confirms due child/project inclusion, won-only exclusion and no financial payload leak. Existing three-student relationship workflow UAT passes independent deals, persistent relationship, follow-up concurrency, atomic audit rollback, project separation, archive/restore, explicit relink and role guards. Browser verifies bilingual due comparison, English card/sort switching, Chinese partner approved receipts50 with two opportunities/one distinct student, and empty financial evidence labeled unverified; console clean.
- Risk/coverage: historical identities and document ownership remain subject to explicit business review; no CSV backfill, guessed allocation, production business test writes or messages. All financial metrics are reviewed evidence coverage, not a claim that every historical document is attributed.
- Migration: none. No contract, billing, receipt, ledger or scheduling behavior changed.
- Remaining: phase2 implementation acceptance closes after release verification; phase3 correction workspace and phases4–10 remain. This is not programme completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `c571101bb2b42ae0f778e3f267b51c6cffd548a9` (r423).

---

Logs: `/tmp/sgt-r424-focused.log`, `/tmp/sgt-r424-backend.log`, `/tmp/sgt-r424-uat.log`, `/tmp/sgt-r424-http.log`, `/tmp/sgt-r424-workflow.log`, `/tmp/sgt-r424-build.log`, `/tmp/sgt-r424-tsc-final.log`. First build exposed a QA-script inference error; explicit metric/return types fixed it and final checks passed. Expected serialization/cross-profile failures in workflow log are rejection tests.

## 2026-09-28-r425

- Release ID: `2026-09-28-r425`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release evidence is maintained in the execution ledger.
- Problem: contract voiding updated status separately from its event, accepted a contract ID from another package and lacked source-version/retry protection. The page could remain stale after a successful action, and void-only history incorrectly appeared to be a package with no contract history.
- Change: exact package scope, locked serializable transaction, optimistic source version, bounded reason required for signed/executed contracts, atomic VOID status/event and idempotent retries. Retained signatures, PDFs and invoice references also protect legacy signed history with missing timestamps from draft deletion. The client opens the saved result and distinguishes no active contract from no history.
- Business truth: the action explicitly says “Void contract only” in ZH/EN/BILINGUAL. Invoice, receipts, purchased entitlement and lesson ledger remain unchanged and require separate review. This does not claim a financial reversal or refund. Existing role boundaries, full-care context and old URLs remain.
- Validation:19 focused tests,181 backend tests,full TypeScript and260-page production build. Isolated service UAT covers cross-package IDs, stale versions, reason validation, forced rollback, concurrency/retries with one event, legacy signature evidence and unchanged shared package/ledger/billing/approval snapshots. Five-role HTTP checks admin read/form version, FINANCE/SALES/CS route restrictions and observer mutation denial. Actual browser English void navigates to its saved result; Chinese and bilingual history/empty states retain signed documents, with only a genuinely unsigned draft deletable. Persisted browser result has one VOIDED event; total6000,remaining2130,shared membership and ledger unchanged; console clean.
- Migration: none. No production business writes or external communications used for acceptance.
- Remaining: phase3 transaction correction preview and append-only entitlement correction, signing/invoice race hardening, and phases4–10. This release is not phase3 or programme completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `c73a5a39464840056a70c4448af37bcc23234710` (r424).

---

Logs: `/tmp/sgt-r425-focused.log`, `/tmp/sgt-r425-backend.log`, `/tmp/sgt-r425-uat.log`, `/tmp/sgt-r425-http.log`, `/tmp/sgt-r425-build.log`, `/tmp/sgt-r425-tsc-final.log`, `/tmp/sgt-r425-browser-post.log`. Both database URLs are guarded before isolated fixture writes. Expected concurrent serialization failure rejects the competing attempt. Browser-discovered stale result and false no-history empty state were corrected and rechecked before release.

## 2026-09-28-r426

- Release ID: `2026-09-28-r426`
- Date/Time (Asia/Singapore): `2026-09-28`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: billing, contract history and package ledger were separate views, making a cancelled-entitlement review easy to confuse with invoice deletion, refunds or student attendance. The package total and approved receipt amount cannot be substituted for each other.
- Change: an optional read-only correction view on the existing package billing URL brings together recorded total, purchase/gift movements, net recorded deductions, reconciled balance, strict parent invoice/approved receipt evidence and all contract history. Low-frequency contract/ledger tables are collapsed. Confirmed purchased total is entered explicitly; a100-hour package with64.5 recorded deductions previews cancelling35.5 hours and retaining zero balance, without inferring entitlement from money or writing anything.
- Safeguards: mismatched balances/purchase totals, missing purchases, historical adjustments, malformed financial records, orphan receipts and unresolved contract-invoice links require review. Shared allocation, partner settlement and monthly validity are identified explicitly rather than treated as ordinary individual hour cancellation. Group-count uses lessons; cancellation cannot increase purchases or create negative balances. Pending/rejected receipts are separate; approved receipt totals are not net revenue after refunds. No actual correction, refund, contract void, approval or lesson operation is executed from this view.
- Access/UI: same billing URL and existing ADMIN/FINANCE boundary, observers read only; no new access for resource-only, operations or teachers. ZH/EN/BILINGUAL; Singapore business dates; original billing and receipt-queue return context retained. Repeated malformed target query values yield review rather than an error page.
- Validation:13 focused tests,181 backend tests,full TypeScript and260-page build. Isolated service UAT covers full/partial/pending/rejected receipts, stale fingerprint, wrong scope, malformed billing, orphan receipts, shared membership and33-contract history including unresolved references; before/after business snapshots unchanged. Seven-role HTTP validates permissions, three languages, source return context, original billing, over-cancellation and malformed targets. Real browser EN previews100→64.5 with35.5 cancelled/zero remaining; ZH blocks50 below consumed entitlement; bilingual view and source-return links verified, console clean.
- Production investigation: read-only aggregates show87 packages,6 shared,56 partner,12 with adjustments,0 monthly/count packages and0 hour-balance mismatches. Historical branches remain for explicit review, not automatic repair. Initial read query used an incorrect relation name; corrected to the schema's txns field before collecting these results.
- Migration: none. No production business test writes or external communications.
- Remaining: phase3 authorized append-only correction, partner/shared/monthly handling and contract-signing/invoice concurrency hardening; phases4–10. This is a read-only foundation, not phase3 or programme completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `3932aa6c7b9b22077e3fe25d4f144a6962ee0724` (r425).

---

Logs: `/tmp/sgt-r426-focused.log`, `/tmp/sgt-r426-backend.log`, `/tmp/sgt-r426-uat.log`, `/tmp/sgt-r426-http.log`, `/tmp/sgt-r426-build.log`, `/tmp/sgt-r426-tsc-final.log`, `/tmp/sgt-r426-production-readonly.log`. Initial QA fixture used the wrong shared-member model name; corrected and rerun successfully. Streaming not-found is checked by its404 body and absence of financial data rather than assuming HTTP404. Existing shared language selector needs saved preference followed by page reload; global language/loading behavior remains phase8/9 work.

## 2026-09-29-r427

- Release ID: `2026-09-29-r427`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: reviewed excess purchased entitlement had no append-only correction action. Legacy gift writes could overwrite a concurrent balance update, and package deletion could remove ledger rows before a later failure.
- Change: owner-only cancellation after a fresh evidence preview. One original purchase is selected explicitly; reason, source evidence and scope acknowledgment are mandatory. The serializable transaction retains the original purchase, appends a negative adjustment, updates total/balance and writes a linked correction proof plus audit atomically. Request keys prevent duplicate execution; changed evidence or concurrent writes require a fresh preview. Verified corrections reconcile separately from historical unexplained adjustments.
- Compatibility: existing gift writes lock the package and increment the current balance; legacy ledger edit/delete/restore verifies its snapshot and cannot alter correction sources or adjustments. Package deletion is atomic and refuses packages with correction history. Existing renewal evidence rules reject corrected purchase evidence; isolated acceptance proves it cannot verify a renewal using the original quantity. This does not reprice historical utilization or change invoice, receipt, refund, contract, attendance or payroll records.
- Scope/UI: ordinary individual minute/count packages only; shared allocations, monthly periods, partner settlements, unresolved finance evidence and historical adjustments remain pending explicit review. ADMIN owner only can execute; FINANCE and other authorized readers retain review access, observers stay read-only. ZH/EN/BILINGUAL result and expandable history on the existing billing URL; all old routes remain.
- Validation:13 focused and181 backend tests; full TypeScript and260-page production build. Isolated service tests prove forced audit rollback, source retention, exact scope, stale rejection, concurrent/idempotent execution, sequential corrections, count units, protected history and unchanged financial sources. HTTP acceptance covers seven non-owner role denials, simultaneous correction/two gifts with no lost balance, protected purchase/adjustment/package deletion, and retry idempotence. Real browser completes100→64.5 hours/zero balance, preserves purchase100 and displays correction-35.5, Chinese audit basis and bilingual preview; console clean. Browser result independently verified in isolated DB.
- Migration: two additive migrations introduce PackageEntitlementCorrection with source/adjustment/package RESTRICT foreign keys, request uniqueness and quantity/unit constraints. No historical backfill. Production acceptance uses schema/read-only checks only; no real business fixtures or external communications.
- Remaining: phase3 contract-signing/invoice concurrency, correction reversal, explicit shared/partner/monthly paths and broader financial utilization regression; phases4–10. This is not programme completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `418643f3a5bbc288215c3d0dbd19e372c91326e9` (r426). Retain additive schema and correction proof on rollback; old readers may require review for the new ADJUST records. Never delete history to roll back.

---

Logs: `/tmp/sgt-r427-focused.log`, `/tmp/sgt-r427-backend.log`, `/tmp/sgt-r427-uat-final.log`, `/tmp/sgt-r427-http.log`, `/tmp/sgt-r427-build.log`, `/tmp/sgt-r427-tsc-final.log`, `/tmp/sgt-r427-browser-post.log`. Expected serialization/FK failures are rejection assertions. Screenshot stored with external execution ledger as `r427-isolated-correction.png`.

## 2026-09-29-r428

- Release ID: `2026-09-29-r428`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: signing created invoices and renewal purchases before the signed contract and its events were saved. A later failure could leave partial business records; simultaneous void/refresh/expiry could overwrite terminal state or duplicate renewal entitlement.
- Change: prepare signature/PDF files before acquiring database locks, then commit the freshly checked contract, invoice, invoice audit, finance gate, renewal purchase, signed/invoice events, intake state and notification outbox in one serializable transaction. Repeated signed submissions return the existing result. Voided, expired, retokened or changed contracts cannot commit an old signature. Outbox writes only queue the existing notification types; they do not send messages in the signing transaction.
- Lifecycle: draft/intake/link-preparation changes compare the source version and save their event atomically. Expiration loses safely to a concurrent update; invoice detachment rereads locked contract state and preserves VOID. Renewal invoice choice now locks the contract, validates current billing, records an audit and advances its version; signed/void contracts cannot change choice. Existing first-purchase versus renewal quantities and invoice-link choices remain distinct.
- Billing compatibility: standalone parent invoice creation also commits invoice/audit/outbox together and retries full transactions on optimistic conflicts. Contract invoice numbering reads current parent/partner/business and retained deleted numbers in the same transaction; unreadable evidence blocks rather than silently resets numbering. This is not a claim that all legacy cross-channel invoice writers have been converted to a global allocator.
- UI: public signing URL, agreement terms, Full Care scope and permissions retained. The browser title is now Student Agreement / 学生协议 instead of incorrectly labeling ordinary tuition contracts as Full Care. New conflict messages are bilingual; existing language modes remain.
- Validation:31 focused tests,181 backend tests,full TypeScript and260-page final production build. Isolated signature UAT verifies failure after invoice/gate/top-up/outbox rolls everything back, one renewal purchase/invoice/event on competing/repeated signatures, signature-versus-void race, deterministic stale link/expiry rejection, signed choice denial, VOID preservation and real PDF creation. Five-role void HTTP and seven-role correction/gift concurrency regressions passed. Actual browser signs a fictional tuition agreement, downloads a valid PDF with the correct token, rejects the wrong token, and independently confirms one signed/invoice event with original first-purchase balance unchanged; browser console clean.
- Read-only production investigation: parent62 invoices/22 deleted, partner13/8, business6/2; all current numbering source records have string invoice numbers. No production business acceptance writes, real signatures or outbound messages.
- Migration: none. Prepared files may remain unlinked after a failed/competing commit; the database does not claim they are signed. Retain them for separate storage hygiene rather than deleting historical signed documents.
- Remaining: phase3 invoice-deletion atomicity/full evidence retention and review-only shared/partner/monthly paths; phases4–10. Programme remains in progress.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `b9324572e9a49f4aee65724ae7b7a29ec2fe742a` (r427). No schema rollback or business-history deletion.

---

Logs: `/tmp/sgt-r428-sign-uat-final.log`, `/tmp/sgt-r428-void-regression.log`, `/tmp/sgt-r428-void-http.log`, `/tmp/sgt-r428-correction-http.log`, `/tmp/sgt-r428-browser-post.log`, `/tmp/sgt-r428-focused-final.log`, `/tmp/sgt-r428-backend-final.log`, `/tmp/sgt-r428-tsc-final.log`, `/tmp/sgt-r428-build-final.log`, `/tmp/sgt-r428-numbering-readonly.log`. Initial legacy billing test failed because its transaction client bypassed the old stub; the fixture now intercepts the transaction and notification recipient lookup. Real isolated database rollback/concurrency tests remain the primary transaction proof.

## 2026-09-29-r429

- Release ID: `2026-09-29-r429`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: deleting an incorrect parent invoice, clearing approval/contract links and logging the deletion were separate writes. A failure could leave partial state; deleted history omitted the original amounts and review reason, and the page could keep displaying the old invoice after success.
- Change: exact invoice/package ownership, source version and bounded review reason checked under a serializable transaction. The complete raw invoice is archived with actor/time/reason and prior contract, application, approval and notification evidence in the audit. Invoice removal, approval removal, gate recalculation, VOID contract detachment, queued-notification skipping and audit commit together. Duplicate requests return the existing archive; receipt/payment-proof/active-agreement/processing-notification conflicts require review. Signed documents, VOID status, invoice numbers, ledger, total and remaining entitlement are retained. No refund is created.
- UI: existing billing and contract actions open the committed result with pending protection; existing deleted-history page expands the original invoice and reason. Historical rows without a snapshot explicitly remain unavailable. New controls/results/history support ZH/EN/BILINGUAL; original role guards and links retained. Unrelated legacy language gaps remain phase8 work.
- Validation:25 focused tests,181 backend tests,full TypeScript and260-page production build. Isolated service UAT covers scoped/stale rejection, audit failure rollback, repeated/concurrent deletion, receipt-versus-deletion races, partial receipts, unallocated payment proof, active tuition/application agreements, processing notices and unchanged ledger. Five-role HTTP verifies existing access and observer denial. Browser submits fictional invoice, opens saved result and ZH/EN/BILINGUAL original evidence; independent DB asserts one archive/audit, retained signed history and600/300 minute balances; console clean.
- Migration: none. Production business records and outbound messages are not used for acceptance. Shared/partner/monthly financial allocation remains explicit review, never guessed.
- Remaining: phase3 acceptance review and phases4–10. This release is not overall programme completion.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `497073b29c446554997d5640a5315d6742b72f9c` (r428); retain archive/audit history.

---

Logs: `/tmp/sgt-r429-focused-final.log`, `/tmp/sgt-r429-backend.log`, `/tmp/sgt-r429-uat-final.log`, `/tmp/sgt-r429-http.log`, `/tmp/sgt-r429-browser-post.log`, `/tmp/sgt-r429-tsc-final.log`, `/tmp/sgt-r429-build-final.log`. Initial fictional invoice number was invalid; fixture now uses normal invoice numbering. Expected serialization conflicts are rejection assertions. Browser found and verified the saved-result navigation fix. Screenshot: external execution evidence `r429-isolated-invoice-archive.png`.

## 2026-09-29-r430

- Release ID: `2026-09-29-r430`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: future sessions inflated the teacher's pending-feedback count, while some Mini Program summaries treated populated proxy drafts as completed teacher feedback. Reminder completion could come from another teacher, and sign-in alert recipients omitted a session's replacement teacher.
- Change: shared final-feedback/state rules distinguish not-yet-due, missing, proxy draft and submitted; either proxy marker remains pending. Final feedback is scoped to the actual session teacher. Web timeline/history, Mini Program teacher history/todos/action-center/management health, admin feedback, lead quality and reminder/alert checks use these rules. Future sessions stay visible but do not count as feedback debt. Teacher alert recipients use the session override before the class teacher.
- Preservation: existing cancellation filters, lesson links, authorization, submitted feedback, attendance, deductions, payroll and historical rows retained. Free/waived teaching still requires feedback; course names or zero price do not grant exemptions. New Web labels support EN/ZH/BILINGUAL. Mini Program response shape remains compatible; no WeChat client release is claimed.
- Validation:27 focused tests,181 backend tests,TypeScript and260-page production build. Isolated seven-session fixture verifies Web/Mini Program both count4 pending,1 completed,2 proxy variants remain pending, future/cancelled lessons excluded, free teaching retained and other-teacher feedback cannot complete the current teacher's task. Four correctly addressed override-teacher alerts and4 communication reminders verified; attendance/feedback snapshots unchanged. Actual teacher browser EN/ZH/BILINGUAL passes with clean console.
- Migration: none. No production classroom/business records or outbound messages used for acceptance; isolated alert records only.
- Remaining: phase4 explicit reasoned non-teaching exemptions and source/recreated lesson traceability; phases5–10. Whole programme is still in progress.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `b00e192a38aa56e6b96b2c3c7c1ee46e69bd3cdd` (r429).

---

Logs: `/tmp/sgt-r430-focused.log`, `/tmp/sgt-r430-backend.log`, `/tmp/sgt-r430-uat-final.log`, `/tmp/sgt-r430-tsc-final.log`, `/tmp/sgt-r430-build-final.log`. Screenshot: external `r430-isolated-feedback-state.png`. Fixture stores only local fake-account details in `/tmp/sgt-r430-fixture.json`; never a production login.

## 2026-09-29-r431

- Release ID: `2026-09-29-r431`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: exam-only or other reviewed non-teaching bookings appeared as missing teaching feedback, while individual detail/staff schedule views could still treat a proxy draft as completed.
- Change: teaching management can review one exact session with an explicit activity, reason, acknowledgment and preserved actor/time/audit. Only a fresh non-teaching review exempts feedback; free lessons and course names do not. Changed teacher, time, class or student roster invalidates the review. Existing final feedback prevents exemption. Submission and review serialize against each other; repeated requests do not duplicate audits. Teacher details, timelines, history, Mini Program backend summaries and reminder predicates share the result.
- UI: collapsed review section in the existing attendance page, explicit involved students, reason and reviewer; teacher detail retains attendance and explains exemption. New controls support ZH/EN/BILINGUAL. History, role restrictions, schedule, deductions and payroll are retained. This does not deploy a new WeChat client.
- Validation:29 focused tests,181 backend tests,TypeScript and260-page production build. Isolated service UAT verifies scope, audit rollback, idempotence, stale review, restoration and concurrent teacher submission; HTTP UAT verifies five denied roles, complete group roster and new-student invalidation, Web/Mini Program consistency and unchanged attendance. Actual browser saved fictional exam-only review, verified three language modes and teacher result without feedback form; console clean. Independent DB check confirms all three review audits, original attendance, zero invented feedback/ledger entries.
- Migration: one nullable Session.feedbackPolicyJson JSONB column; no backfill, no production exemption or business-record mutation for acceptance.
- Remaining: phase4 source/recreated lesson traceability and phases5–10; programme remains in progress. Unknown historical ownership must remain review-only.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `35443363b5b5e3dbc571b1e009685fc12ef28b49` (r430); retain nullable column and audit evidence.

---

Logs: `/tmp/sgt-r431-focused-final.log`, `/tmp/sgt-r431-backend.log`, `/tmp/sgt-r431-uat-final.log`, `/tmp/sgt-r431-http-final.log`, `/tmp/sgt-r431-browser-post.log`, `/tmp/sgt-r431-tsc-final.log`, `/tmp/sgt-r431-build-delivery.log`. Screenshots: external `r431-isolated-feedback-policy.png` and `r431-isolated-teacher-result.png`. Expected serialization conflicts were safe rejection assertions. Global language refresh/loading gaps remain tracked in phase8/9.

## 2026-09-29-r432

- Release ID: `2026-09-29-r432`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: legacy class-session deletion bypassed the schedule's linked-record check, the schedule check raced deletion, parent class/teacher/campus deletion could cascade through history, and appointment deletion guessed a lesson from teacher/time alone.
- Change: one serializable service locks and freshly checks the exact session/class. Only unused future sessions can be deleted. Attendance facts/notes/waivers, package transactions, feedback, feedback review, teacher changes, alerts, booking/ticket references (including result arrays), manager feedback and payroll overrides block deletion. Complete source and participant/course snapshots commit with deletion and audit, or all roll back. Repeated concurrent deletion cannot duplicate history. Existing class and schedule routes and legacy server action use the same service.
- Parent and appointment protection: classes, campuses and teachers with any dependent records cannot be cascade-deleted; employee profile references are also retained. Truly unused parents are audited and deleted atomically. Appointment deletion retains matching lessons and asks for separate review instead of guessing ownership; unused unlinked future appointments retain snapshots. Deletion requires teaching management and rejects observers. No source data is automatically relinked or refunded.
- Validation:181 backend tests,TypeScript and260-page production build. Isolated UAT verifies class scope, forced audit rollback, concurrent deletion, full snapshots, feedback-versus-delete race, payroll/attendance/history retention, ledger/ticket arrays/employee profile protection and parent bypass denial. HTTP tests cover five denied roles, both session deletion paths, wrong-class rejection, protected parent records, appointment time collision and independent unused appointment deletion. Actual browser displays retained lessons and removal history with teacher/student/time/actor; console clean.
- Language: bilingual action errors and preserved ZH/EN/BILINGUAL history renderer and existing controls. No new independent navigation or miniapp client release.
- Migration: none. Production business records were not deleted or changed for acceptance. Deleting a populated class/teacher/campus is intentionally rejected; its individual business records must be reviewed.
- Remaining: explicit original/recreated lesson linkage and phases5–10; this safety checkpoint does not recover previously destroyed feedback or infer historical ownership.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `c6c9fbce4840adab6274e3c156c0ff524aa7cb01` (r431); retain all audit snapshots.

---

Logs: `/tmp/sgt-r432-uat-final.log`, `/tmp/sgt-r432-linked-uat-final.log`, `/tmp/sgt-r432-http.log`, `/tmp/sgt-r432-backend.log`, `/tmp/sgt-r432-tsc-delivery.log`, `/tmp/sgt-r432-build-final.log`. Screenshot: external `r432-isolated-deletion-history.png`. Initial UAT found payroll is a to-one relation omitted from Prisma relation counts; an explicit check fixed it. Employee profile is also checked explicitly. Test fixture password fields corrected; no production fixture used.

## 2026-09-29-r433

- Release ID: `2026-09-29-r433`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: reviewing a recreated lesson required finding its work order and audit separately, while the original URL only showed not-found after a historical deletion. Similar students/times could be mistaken for a confirmed relationship.
- Change: a collapsed read-only section on the existing attendance page shows exact current source/result IDs, existing work-order links and separately recorded audit references, actor/time and before/after snapshots. Missing original rows still expose retained evidence through the original URL; class history links directly to that evidence. Unknown or inconsistent historical references remain explicit; no name/date inference, automatic relinking, attendance completion, feedback transfer, deduction or refund occurs.
- Preservation: existing role access, old routes, history and business writes retained. The existing explicit ticket result workflow remains the way to link verified available lessons. New labels support EN/ZH/BILINGUAL; absence of records is not presented as proof that no changes occurred. Results are bounded to recent20 actions/30 audits with a visible truncation notice.
- Validation:4 projection tests,181 backend tests,TypeScript and260-page production build. Isolated UAT covers direct and array result references, missing historical source, exact archived evidence and exclusion of same-name/same-time unrelated lessons. Actual existing-result verification and HTTP pages retain both IDs with unchanged attendance, feedback and ledger; ordinary teacher access stays denied. Browser follows the archived source link and checks EN/ZH/BILINGUAL context, snapshots and missing-evidence labels; console clean.
- Migration: none. Read-only feature; no production business records or outbound messages used for acceptance.
- Remaining: phase4 roster inconsistency found in acceptance (explicit one-to-one student absent from Enrollment can show0 students) and phases5–10. Previously destroyed evidence cannot be invented or automatically repaired.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `e8d3f78c99f9f8ce05ae5667f9cbe7da4fca39da` (r432).

---

Logs: `/tmp/sgt-r433-focused.log`, `/tmp/sgt-r433-uat-final.log`, `/tmp/sgt-r433-http.log`, `/tmp/sgt-r433-backend.log`, `/tmp/sgt-r433-tsc-final.log`, `/tmp/sgt-r433-build-delivery.log`. Screenshot: external `r433-isolated-source-history.png`. Browser review clarified that no current work-order link does not mean no historical audit reference.

## 2026-09-29-r434

- Release ID: `2026-09-29-r434`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release proof is maintained in the execution ledger.
- Problem: a one-to-one lesson could explicitly name a student while its Enrollment row was absent. The admin page, teacher page and Mini Program attendance filtered Enrollment and showed0 students, but admin deduction accepted the explicit lesson student. Ambiguous legacy one-to-one classes could instead expose multiple candidates.
- Change: shared attendance roster prioritizes exact Session.studentId, then explicit class student, then only a single unambiguous enrollment. Group lessons retain distinct enrolled students. Admin/teacher attendance pages, both save services and Mini Program attendance use this rule. Missing/ambiguous ownership requires review, with no arbitrary first student or automatic Enrollment insertion. Teacher feedback save also rejects unresolved ownership; current feedback is retained. New backend rosterNeedsReview flags are additive; no WeChat client deployment.
- UI: exact students remain visible without Enrollment. Ambiguous rosters show review instructions instead of claiming all0 students were marked or labelling the student cancelled; saving attendance/new feedback waits for review. New labels support ZH/EN/BILINGUAL.
- Validation:5 roster tests,181 backend tests,full production build. Isolated service UAT covers explicit session and class-default students without Enrollment, foreign enrolled student rejection, ambiguous one-to-one denial, exactly one admin debit and unchanged teacher ledger. Existing admin/teacher attendance rollback, concurrency, shared-count/minute and no-overspend suites pass; feedback exemption/submission race regression passes. Web/Mini HTTP checks consistent rosters, both factual saves, wrong-student/ambiguous rejection and unchanged package/ledger snapshots. Browser checks exact student and three-language review state.
- Migration: none. No production attendance, deductions, refunds, Enrollment or feedback were changed for acceptance. This is an exact-identity fix, not historical attribution inference.
- Remaining: phase4 acceptance review and phases5–10. Existing global language/loading cleanup remains planned separately.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.
- Rollback point: `d0d4d4a30261046dbac6f5f94134556cf8f035b8` (r433).

---

Logs: `/tmp/sgt-r434-focused.log`, `/tmp/sgt-r434-uat-final.log`, `/tmp/sgt-r434-http-final.log`, `/tmp/sgt-r434-admin-regression.log`, `/tmp/sgt-r434-teacher-regression.log`, `/tmp/sgt-r434-feedback-regression.log`, `/tmp/sgt-r434-backend.log`, `/tmp/sgt-r434-build-delivery.log`. Expected serialization conflicts assert safe rejection. Browser found and fixed misleading zero-student completion/cancelled labels. Screenshot: external `r434-isolated-roster-review.png`.

Browser evidence note: one earlier React hydration #418 at03:18:32UTC was captured during local runtime rebuild acceptance. Final-build reload/language checks added no new error entries; underlying cause remains a phase9 stable-runtime investigation, not a claim of a completely clean console history. Final backend log: /tmp/sgt-r434-backend-final.log.

## 2026-09-29-r435

- Release ID: `2026-09-29-r435`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release evidence is recorded in the execution ledger.
- Problem: monthly scheduling could be marked complete after finding any one lesson for a student/course in the month; confirmed arrangements shared the completed queue, and pause/exclusion lacked a required reason.
- Change: completion selects exact formal lesson IDs, records the confirmed monthly total and review basis, validates student/course/month/cancellation, rejects overlap and missing monthly minutes, and verifies every accepted option date/time/teacher. Item, accepted offers, evidence snapshot and audit commit atomically with row locks and revision checks. Existing owners and parent replies stay intact; editing a completed item's note does not renew completion proof.
- Read views: confirmed arrangements return to the confirmation/verification queue. Stored completion evidence is checked against current exact lessons; missing legacy proof or changed lessons surface for review in Web and parent/staff APIs without rewriting history. Pause/exclusion requires a reason. Existing Mini Program completion requests without evidence receive a web-workspace instruction; no WeChat client package is published.
- UI: collapsed formal-timetable verification with candidate lessons, total, basis and last-verification links; EN/ZH/BILINGUAL for changed controls. Pending submissions disable inputs and open the saved result, fixing stale post-save state observed in browser acceptance. Existing broader monthly-page language cleanup remains in phase8.
- Validation:33 focused tests,181 backend tests,260-page production build and full TypeScript. Isolated service covers missing/partial/duplicate/foreign/cancelled/mismatched lessons, forced audit rollback, concurrent completion once, owner/response preservation, current-vs-historical evidence review and unchanged attendance/feedback/ledger. HTTP covers four denied roles, legacy Mini bypass rejection, pause reason, shared staff/parent review state, family scope and private-note non-disclosure. Browser verifies real form save/result navigation and three-language changed controls.
- Migration: additive nullable `MonthlySchedulingItem.scheduleEvidenceJson`; no backfill. Business-write acceptance uses isolated PostgreSQL only. No real classes, balances, messages, parent responses or completion statuses are altered by deployment.
- Remaining: phase5 full sender/parent-response/manual-status transition review and capacity forecast; phases6–10 plus phase4 acceptance review. For arrangements without accepted options, the monthly count and basis are explicitly reviewed by staff, never inferred from four weeks.
- Rollback point: `a3b67bbb05d9ede90998dbd4f8687bf65786ee9f` (r434); nullable column may remain.
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.

---

## 2026-09-29-r436

- Release ID: `2026-09-29-r436`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release evidence is maintained in the execution ledger.
- Problem: the monthly scheduling status dropdown allowed staff to manufacture parent-read, reply and time-selection states without using the corresponding workflow, and an unresolved teacher identity could appear in the ready-confirm queue.
- Change: shared Web/Mini status policy rejects new parent-observed states from generic status edits, preserves note-only updates, requires manual-send time/channel notes, prevents an existing reply being relabelled no-response, requires a recorded arrangement and resolved teacher identity for manual matching, and requires a reason to reopen completed verification. Parent time selections still use their live held offer; exact completion remains owned by r435's evidence check. Teacher identity review takes priority over keep-current intent in queue placement.
- UI: status choices include only staff follow-up states plus the current status; owner is visible; send-record vs delivery/read/reply is explained in ZH/EN/BILINGUAL. Rejected actions open a red review message and leave state unchanged. Historical statuses, legacy links and existing client payloads remain readable; no WeChat package is uploaded.
- Validation:41 focused tests,181 backend tests,TypeScript and260-page build. Isolated service UAT verifies no fabricated facts/no erase of replies, valid keep and held-offer confirmation, unresolved-teacher rejection, preserved owner/response and unchanged lesson/ledger counts. Authenticated Mini HTTP verifies crafted-state rejection, manual-send evidence and timestamp preservation during note updates. Browser verifies reduced dropdown, failed match with review message, owner display, result navigation and three-language instructions.
- Migration: none. No production parent replies, notifications, lessons or balances changed for acceptance.
- Remaining: phase5 response/hold transaction and staffing forecast review, phase4 acceptance and phases6–10. This release does not claim a manual send note proves delivery.
- Rollback point: `387727a592547688f1be016871bc94025ae3ffd0` (r435).
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.

---

## 2026-09-29-r437

- Release ID: `2026-09-29-r437`
- Date/Time (Asia/Singapore): `2026-09-29`
- Deployment status: `READY`; guarded release evidence is recorded in the execution ledger.
- Problem: expiry scanned held time options before its transaction, then expired by ID/status without rechecking the deadline. A concurrent parent renewal could therefore be expired using a stale scan; an item could return to options despite another live hold.
- Change: scan, deadline-qualified expiry, conditional queue update and audit now use one serializable transaction. Only serialization/deadlock conflicts retry, at most twice. A remaining held/accepted/completed option prevents automatic queue downgrade. The result counts actual expirations; repeats do not duplicate audits.
- Validation:41 monthly focused tests,181 backend tests,260-page production build,TypeScript. Isolated deterministic renewal between scan and mutation survives; real expiry records one audit; another live hold preserves selection; injected audit failure rolls back item and offer; concurrent scans expire once. Session, feedback and ledger counts remain unchanged. Parent/staff authenticated HTTP completion/review regression passes. No user interface or client payload changed in this release.
- Production read-only context:181 monthly items (52NOT_SENT,111NO_RESPONSE,18EXCLUDED),0 options; r435 nullable evidence migration finished2026-09-29T03:48:22.953Z,0 evidence records. No real expiry, send or reply was used for acceptance.
- Migration: none. Existing parent selection and teaching/finance workflows are retained.
- Remaining: parent response persistence/offer refresh and staffing forecast review; phase4 acceptance plus phases6–10.
- Rollback point: `68c5b33b6d7ec310ee9222f8b9449fda717ce3a2` (r436).
- Task: `docs/tasks/TASK-20260928-workspace-completion.md`.

---
