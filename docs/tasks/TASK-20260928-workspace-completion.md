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
