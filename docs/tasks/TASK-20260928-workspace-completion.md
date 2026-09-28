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

Authenticated local HTTP UAT also passed: web and staff Mini Program APIs return expected results and observer writes remain forbidden. Browser presentation review and guarded release of this checkpoint remain pending. Remaining phase 1 items (attendance change impact, renewal risk/completion, approval scope) and all later project stages remain pending. This checkpoint is not final project acceptance or a production release claim.
