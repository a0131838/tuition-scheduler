# TASK-20260805-full-care-pricing-contract-correction

## Context

The first 赵测试 2 E2E contract incorrectly used the package's O Level course name, a manually rounded tuition fee and student-level channel commission fields. Full Care is the product being contracted; commission is only an external management calculation. The published price list has one standard tuition rate for non-IB/AP courses and a separate IB/AP premium rate.

## Change

- Add four controlled Full Care plans: standard 200/300 hours and IB/AP 200/300 hours.
- Derive tuition from the published 100-hour prices and add the annual S$12,800 Full Care service fee.
- Lock hours and fees on the server from the selected plan.
- Title the parent document `Full Care Service Agreement / 全程托管服务合同` and show a tuition price tier instead of the package's current course name.
- Remove Full Care channel name, commission rate, preview, validation and audit payload fields from the contract system.
- Preserve historical signed-contract immutability; correct the synthetic test by voiding and reissuing rather than rewriting its signed PDF.

## Non-goals

- No general partner-settlement, invoice, receipt, payment, package-balance, attendance, payroll, scheduling or lesson-deduction changes.
- No automatic price discounts or student-specific commission storage.

## Verification

- 18 focused pricing, contract, care-safety and parent-progress tests pass.
- All four plan totals reconcile to the published price list.
- The complete 240-page production build passes.
- Production verification will confirm no O Level or commission text on the corrected parent contract.

## Risk

Moderate and contained to preparation of new Full Care contracts. Existing signed documents are immutable and require explicit void/reissue when incorrect.
