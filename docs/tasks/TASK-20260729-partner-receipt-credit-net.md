# TASK-20260729-partner-receipt-credit-net

## Context

Partner invoices correctly showed their adjusted net after issued Credit Notes in Finance Documents, but the Create Receipt form still defaulted Amount, Total and Amount Received to the original gross invoice. Selecting another invoice also left the first invoice's amounts on screen. For `RGT-202606-0019`, this presented SGD 18,540 even though issued Credit Note `RGT-CN-202607-0001` reduced the real bank receipt to SGD 18,270.

## Change

- Added one shared calculation for original amount, issued-credit amount and adjusted receipt net.
- Included only `ISSUED` Credit Notes; `DRAFT` and `VOID` notes do not reduce the receipt.
- Added a client-side invoice selector that updates Amount, GST, Total, Amount Received and Received From together.
- Made calculated receipt values read-only and displayed original, credit and net totals before creation.
- Recalculated the latest net in the server action and ignored browser-submitted amount fields.
- Added an automatic receipt note naming the Credit Note and showing the original-to-net calculation.
- Excluded invoices whose issued credits already reduce the net to zero.

## Non-goals

- No production receipt is created by deployment or verification.
- No existing invoice, Credit Note, receipt, payment record or approval is edited.
- No change to parent receipt, partial parent-payment, package, attendance, scheduling, payroll or settlement logic.
- Partner billing still permits one receipt per invoice; multi-receipt partner payments remain outside this change.

## Verification

- `node --test --import tsx tests/partner-receipt-net.test.ts tests/finance-documents.test.ts` passed 10 tests.
- `npx tsx --test tests/*.test.ts` passed all 295 repository tests.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- `npm run build` passed and generated 229 pages.
- Read-only production data confirmed the target invoice has SGD 18,540 original, SGD 270 issued credit, SGD 18,270 adjusted net, one matching payment proof and zero receipts.

## Risk

Low to moderate and limited to creating a new partner receipt. The server now owns the receipt amount calculation, so a Credit Note issued or voided after page load is reflected at submit time. Existing partner receipts remain immutable through this flow.

## Release Record

- Release ID: `2026-07-29-r299`
- Deployment status: ready.
- Rollback point: `ad9af64021f0dd33639d073d443634288580446e`
