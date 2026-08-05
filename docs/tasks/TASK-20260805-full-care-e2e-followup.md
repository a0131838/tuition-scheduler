# TASK-20260805-full-care-e2e-followup

## Context

The production end-to-end journey for test student 赵测试 2 completed contract, activation, report and parent-question workflows, but exposed three operator gaps: care discovery depended on a separately maintained student classification, care updates had no manager publication control, and new tasks had no parent-action fields. The signed-contract success page also requested a stored signature path that was not directly public.

## Change

- Discover ACTIVE care engagements for report-authorized parents without requiring a legacy student service classification.
- Add audited manager publish/revoke controls for parent-audience care updates.
- Let staff create a task with a required parent-facing action summary.
- Replace the broken signature thumbnail request with signer confirmation and a note that the handwritten signature is stored in the signed PDF.

## Non-goals

- No changes to payment, receipt, package balance, attendance, payroll, scheduling or historical lesson logic.
- No automatic publication of internal notes or unreviewed care records.
- No automatic parent messaging.

## Verification

- `node --import tsx --test tests/miniapp-parent-service-progress.test.ts tests/care-server-action-safety.test.ts tests/care-validation.test.ts tests/care-reports.test.ts`
- `npm run build`
- Production E2E evidence for 赵测试 2: ACTIVE and 7/7; signed Full Care contract; published and acknowledged monthly report; parent question answered and closed.

## Risk

Low to moderate. The visibility path changes only Full Care parent-facing data and keeps report permission, parent audience, public summary and manager publication controls. Nearby finance and teaching records are untouched.
