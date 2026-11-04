# TASK-20261104-renewal-signature-exception

## Context

Finance requested a controlled way to activate an ordinary student package renewal after full cash payment when the parent's e-signature is still pending. The current sign-first workflow blocks the renewal hours until the parent signs. Payment must not silently change the agreement's signature state or cause an older invoice to be reused for a new renewal.

## Change

- Add an exception record bound to one prepared tuition-hour renewal contract, its frozen fee and lesson hours, and one current-cycle invoice. An invoice already linked to another non-void contract or confirmed renewal cannot be reused. To avoid using old-cycle evidence, the invoice and dedicated cash payment record must be dated no earlier than seven days before the contract was created.
- Only a configured Finance approver with the Finance role can submit and activate. A different configured manager approver must approve this exact request. The request, approval and activation each recheck exact full payment through approved cash receipts and their matching dedicated cash payment records.
- Activation records the invoice, receipt IDs and numbers, amount, Finance reason and actor, manager approval, timestamp and seven-day parent-signature follow-up date. It adds the hours once through the existing contract renewal ledger marker and leaves the contract `READY_TO_SIGN` with `signedAt` empty. Later parent signing reuses the linked invoice and cannot add the hours again.
- Show the exception workflow from the package contract page and an outstanding-signature list in Finance. Activated terms cannot be edited or directly voided; an expired parent sign link can be refreshed by an authorised Finance or manager approver.

## Operator steps

1. Confirm this is the current, ordinary direct-billed tuition-hour renewal. In Package Billing, issue a **new invoice for this renewal**, record its full cash payment and cash receipt, link the receipt to the dedicated payment record, and complete receipt approvals. Do not reuse the previous signed renewal's invoice.
2. Open **Packages → Contract → Paid renewal, signature pending**. The configured Finance approver selects the current invoice, explains why the parent has not yet signed and states the follow-up plan, then submits.
3. The configured manager approver reviews the exact contract amount and hours, invoice and approved cash receipts, then approves or rejects with a reason.
4. The configured Finance approver checks the evidence again and activates. The page displays **renewal activated; parent e-signature pending**, with invoice, receipt, actor and timestamp in the audit trail. Finance follows up through **Finance → Renewals awaiting parent signature** and refreshes an expired sign link when needed.
5. Once the parent signs, check that the agreement is marked signed and no second renewal top-up was posted. If a payment or receipt is reversed after activation, Finance reconciles the invoice and lesson ledger immediately.

The current Allie example is **not** eligible yet: the November renewal is SGD 5,500, while the observed new cash record was SGD 152 and the previous SGD 5,500 invoice belongs to an older signed renewal. No production package hours or financial record are changed by this release.

## Non-goals

- No automatic legal conclusion that payment equals a signed agreement; the parent's signature stays outstanding.
- No bypass for initial purchases, full-care/SSG contracts, partner-settled packages, partial payment or non-cash payment.
- No automatic activation of existing production records or automated message to the parent.

## Verification

- Prisma schema validated; all existing and new migrations applied to an isolated PostgreSQL test database.
- Focused unit and database integration tests cover role separation, old invoice rejection, partial payment rejection, immutable contract snapshot, receipt changes, activation, duplicate prevention and later signature.
- TypeScript and production build passed. Production verification is read-only for the reported example; the operator must complete the live evidence and approvals before activation.

## Risk

Medium: this is a financial and lesson-ledger exception. Strong role separation, current-cycle evidence, transaction locking and an idempotent ledger marker reduce incorrect or duplicate top-ups. Finance must monitor later receipt changes and outstanding parent signatures. Roll back the application release if needed; retain audit and financial records for reconciliation.
