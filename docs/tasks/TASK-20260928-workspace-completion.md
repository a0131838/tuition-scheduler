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
