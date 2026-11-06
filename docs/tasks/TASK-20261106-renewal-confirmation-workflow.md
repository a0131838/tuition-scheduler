# Renewal action queues, same-term confirmation and bounded continuation

Release: 2026-11-06-r506

## Problem and resulting behavior

A submitted cash-paid signature exception was not visible in the manager's Todo or unified approval inbox. Finance also requested clearer division of academic, sales and finance responsibilities, fewer repeated full signatures for unchanged renewals, and explicitly approved short continuation while collecting payment.

Renewal exceptions now project their current actionable phase into the manager's Todo and the unified approval inbox; Finance also sees its tasks on the Finance Workbench. Approved requests move to Finance activation, activated unsigned requests move to signature follow-up, and signed/completed requests leave the queue. Existing role configuration remains authoritative; a teacher identity does not acquire manager authority.

Add a separate immutable RenewalOrder for eligible ordinary direct-billed one-to-one hour packages. Academic prepares the learning plan and dates; Sales confirms commercial details; configured management records the policy/eligibility review; the parent expressly accepts a scoped confirmation under a previously signed version-2 agreement; authorised Finance links the current invoice and activates only against exact full approved receipts. Version-2 ordinary tuition wording introduces this future confirmation mechanism without changing historical signed snapshots. Every order references its original agreement, current contract hash, dates, amount and hours. Changed or old terms, PEI/EduTrust, Full Care, partner, monthly, group/shared packages and fractional-SGD fees keep the existing contract workflow. No payment or electronic acceptance is mislabelled as a new drawn signature.

Optional unpaid continuation needs independent manager approval of minutes, exposure, expiry (within 30 days and the service period), reason and collection owner, followed by Finance release. Its dedicated package stays unpaid and has finite minutes and validity. At full payment that portion becomes paid and the original package receives only the unallocated balance; remaining continuation hours are retained. This avoids entitlement duplication and preserves ordinary attendance rollback behavior. Receipts and money are not fabricated by credit release. Activated receipt evidence changing creates a reconciliation task, not an automatic reversal.

## Scope and implementation

- New orders and evidence constraints are additive migrations; add `RENEWAL_CONFIRMED` to distinguish renewal acceptance from a new signature.
- Matching open renewal tasks finish with receipt/entitlement audit proof; associated progress reports are retained.
- Guard invoice reuse/deletion, concurrent activation, full-signing fallback and contract mutations while an order is open. Cancellation of an unused stale order remains possible; released credit requires reconciliation.
- Public confirmation uses a high-entropy link, original contracting parent's name, explicit checkbox acceptance, immutable terms, timestamps and audit. Links expire in 14 days and can be rotated before acceptance. No automatic parent messaging is introduced.
- Existing sign links lead to the applicable confirmation when an order exists. Parent error messages are kept in view despite global flash-query cleanup.
- Add training-route coverage, inline bilingual guidance and `docs/续费确认与限额续课-操作指南-20261106.md`.

## Verification

- Targeted tests: 33 passed, including an isolated PostgreSQL lifecycle (roles, legacy/version/terms rejection, parent acceptance, pending/full receipts, credit limits/expiry, concurrent activation, amount/minute totals, follow-up and reconciliation queues, exact task completion and entitlement proof).
- Existing backend regression: 185 passed. The new public page is assigned to the training operation catalogue.
- TypeScript, final production build, isolated browser QA and guarded release: completion recorded below after execution.
- Production validation is read-only. This release must not approve, activate, add hours or send messages for a real student.

## Operational boundaries and rollback

Jasmine must use her configured management Admin identity. Sharilyn must use her authorised Finance identity. Their current real paid-cash request still requires their own review/activation; deploying the code is not approval.

The new same-term mechanism is opt-in per eligible renewal, with management recording the applicable policy review. Old agreements are not silently upgraded, PEI/regulated courses remain on the full-contract path, and revised terms require full agreement. No blanket legal conclusion about invoice-only renewals is encoded.

Keep additive tables, evidence and the enum on rollback; do not drop business data. Before reverting after any real order/credit is used, stop new order actions and reconcile its invoices and entitlements. Continue using the existing full-contract and paid-cash exception workflows where applicable. Post-activation payment changes and any cancellation of released credit require Finance/management reconciliation.

## Completed local verification

- Final clean production build passed with no warnings. TypeScript validation passed.
- Existing backend suite: 185/185 passed. Targeted suite: 33/33 passed; extra integration checks confirm matching task completion, full entitlement proof and changed-receipt reconciliation.
- Fresh empty PostgreSQL migration run applied all three new migrations, including evidence/null guards, successfully.
- Production-build browser verification: 12 scenarios passed, zero page errors. Covered Academic/Sales separation, manager Todo before attendance on mobile, unified approvals, manager policy review, parent identity rejection and successful confirmation, unpaid activation rejection, separate credit approval/release, full-payment conversion without duplicate hours, mobile overflow and anonymous/invalid-token boundaries. Screenshots visually reviewed.
- Local build retries resolved generated-output collisions and a backup-directory type-scan issue; the recorded final build is a single clean successful build. No application fallback or test bypass was used.
- Production confirmation is recorded after the guarded release; no real business action is part of verification.
