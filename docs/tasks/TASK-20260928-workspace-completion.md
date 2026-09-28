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
