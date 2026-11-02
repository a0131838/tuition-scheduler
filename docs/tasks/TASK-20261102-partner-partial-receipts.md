# TASK-20261102-partner-partial-receipts

## Context and authorization

Finance clarified that RGT-202609-0008 (SGD 5,580) is valid: Beijing remitted SGD 3,690 to GTEI; Singapore will pay the remaining SGD 1,890. The owner authorized implementing the proposed partial-payment workflow. This is authorization for code deployment, not for creating actual production financial records.

## Implementation

- The Create Receipt form accepts only the actual payment amount, actual payer, date, method and optional existing payment proof. Original invoice amount/customer remain unchanged. GTEI is the sole supported receiving entity/issuer and is displayed explicitly.
- The server derives partial subtotal/GST in integer cents and reconciles rounding on the final instalment, accounting for issued Credit Notes. Posted subtotal/tax/total are ignored.
- Approved receipts reduce outstanding; approved plus pending receipts reserve available balance. Rejected receipts release capacity. Reapproval and owner reopen recheck capacity.
- A transaction advisory lock coordinates partner receipt writes/reactivation and Credit Note issue. Existing JSON optimistic locking still protects unrelated ledger writes. Form submission IDs return the same receipt on retry; changed payloads require refresh.
- New receipts use invoice-RC-01, -02 etc. Legacy invoice-RC identifiers remain unchanged. A per-invoice high-water counter avoids reusing deleted numbers.
- Completed receipts cannot be directly deleted. Existing owner reopen/audit workflow remains available and preserves its authorization boundary.
- Creation and deletion save audit snapshots. The server invalidates the billing route after successful creation; refresh before preparing the next payment to load a new submission reference and latest balance. Expected approval/reopen balance failures return to the approval page with a refresh/review message.
- Approval review uses the whole invoice's receipts across months and issued credits; a legitimate partial amount is no longer itself a mismatch. Existing missing-proof risk indicators remain.
- Receipt PDF and lists show the original invoice customer, actual payer and receiving entity. Only completed receipts export. Existing central finance totals already support multiple approved/pending receipts and have been reconciled in the isolated test.

## Verification

- `npx tsx --test tests/*.test.ts`: 812 tests passed.
- `npm run build`: production build passed.
- `scripts/qa/partner-partial-receipts-uat.ts`, guarded to the local isolated database: same submission concurrent retry returns one receipt; 3,690 + 1,890 reconciles to zero; 1-cent excess rejected; simultaneous 80 + 80 against 100 has one winner; rejected receipt reapproval/reopen cannot overbook; completed deletion blocked; deleted numbers not reused; legacy RC retained; Credit Note net and invalid entity/precision enforced; client subtotal/tax ignored. Restores prior local settings in finally.
- Real browser with an isolated FINANCE user: create Beijing 3,690, see 1,890 available, approve via queue, create Singapore 1,890, approve via queue. Both receipts have distinct RC-01/02 numbers. Tests use clearly marked training records only.
- PDF: pending request HTTP 403; approved requests HTTP 200. Both PDFs rendered as one page and visually inspected for amount, payer, receiving entity and number; no overlap or clipping.
- Existing Finance Documents output: original amount 5,580; approved 5,580; pending zero; remaining zero; receiptCount 2; PAID. Original invoice deep-equality check passes.
- Production baseline read-only: RGT-202609-0008 / a97fbdd3-b748-49da-8b43-e6513e6f4484; total 5,580; zero receipts; zero issued Credit Notes. Repeat after deployment. No real receipt creation.

## Operator steps after release

1. Open Partner Settlement > select New Oriental, Offline Monthly, August 2026 > Create Receipt.
2. Select RGT-202609-0008. Verify the invoice remains SGD 5,580. Check the bank evidence, actual payer and receiving entity.
3. For the Beijing funds already received by GTEI, enter actual received amount 3,690, actual date and Beijing payer; link/upload the appropriate existing payment evidence and submit for the existing finance approval.
4. Refresh the page before preparing another receipt. After approval, approved received is 3,690 and outstanding is 1,890. While the receipt is pending, 3,690 is reserved and the remaining available amount is 1,890.
5. Only once Singapore's 1,890 actually arrives, create a second receipt against the same invoice with Singapore as actual payer and its own evidence/date. If funds arrive at an entity other than GTEI, stop issuing and confirm the supported issuer configuration first.
6. Approve each receipt and export its own PDF. The two approved receipts total 5,580 and outstanding becomes zero.

## Scope and risk

Financial logic changes are restricted to partner partial receipts and the necessary Credit Note/approval concurrency checks. No migrations, invoice rewrite, data correction, external messages, payroll, lesson/package deductions or scheduling changes. Payment proof remains optional as before, with the existing review risk flag; finance remains responsible for evidence and approval. This release does not implement refund handling or arbitrary receiving-company issuance.

Rollback reference: e8fae66af32e47b184539b9f1b475cf52c078e95. Review receipts issued after release before reverting to old one-receipt assumptions.
