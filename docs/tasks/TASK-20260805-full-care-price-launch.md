# TASK-20260805-full-care-price-launch

## Context

The Full Care launch had only four generic 200/300-hour prices, one S$12,800 care fee, and no reliable distinction between accompanied academic care and unaccompanied comprehensive coordination. Contracts were not bound to the exact care project, parent progress could miss structured service scope, and staff had no controlled place to grant an additional family discount.

## Change

- Added 12 immutable `FC2026_V1` plans covering both care products, standard or IB/AP tuition, and 100/200/300 hours.
- Frozen the approved rounded totals and 0%/5%/8% whole-bundle savings, while retaining read-only legacy plan resolution.
- Added an administrator-only management special discount capped at 15%, with mandatory internal reason, approver and contract-event audit.
- Bound each new Full Care agreement to the exact care project and programme type.
- Blocked mismatched care types, standard pricing for IB/AP courses, incorrect package minutes, and shared-student packages.
- Added an annual end date to every new care project and froze the service period in the contract.
- Kept same-year lesson top-ups separate from the annual care charge.
- Expanded the immutable contract snapshot, parent sign summary and invoice description with pricing components and savings.
- Split the two pre-university default service scopes and corrected structured scope/product/end-date output in the parent service-progress API.
- Tightened project activation so an unrelated Full Care contract cannot satisfy the launch gate.

## Non-goals

- No channel commission is stored or shown.
- No existing signed contract, invoice, receipt, payment, package balance, lesson, attendance, payroll or schedule is rewritten.
- No automatic refund calculator is introduced; approved refunds continue through the controlled credit-note path.
- The system does not promise legal guardianship, 24-hour onsite care, medical decisions or unlimited third-party services.

## Verification

- 40 focused pricing, contract, care-scope, sign-page and parent-progress tests passed.
- 136 backend regression tests passed.
- TypeScript validation passed.
- `npm run build` passed for all 240 application pages.
- All 12 totals and component sums are asserted exactly in tests.

## Risk

Medium. New Full Care contracts and invoices now enforce the approved commercial model more strictly. Compatibility is contained by versioned plan IDs and preservation of existing contract snapshots; nearby finance and lesson ledgers are not rewritten.
