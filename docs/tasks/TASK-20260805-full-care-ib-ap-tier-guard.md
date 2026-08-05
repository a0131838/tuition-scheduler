# TASK-20260805-full-care-ib-ap-tier-guard

## Context

Full Care contracts have separate standard and IB/AP price tiers. A standard-tier contract must not be generated for a package that can deliver IB/AP tuition, otherwise the school may need to pursue a disputed price adjustment later.

## Change

- Detect IB/AP tuition from the package's primary and shared course names.
- Recognise IB, IBDP, AP, IB/AP, International Baccalaureate and Advanced Placement naming.
- Restrict the contract-workspace selector to IB/AP plans when premium tuition is detected.
- Enforce the same rule in the server action so a forged form submission cannot bypass it.
- Preserve the same 200-hour or 300-hour choice when an existing draft needs to move from standard to IB/AP pricing.
- Block package course edits that would add or switch to IB/AP while a non-void standard-tier Full Care contract remains active.

## Non-goals

- Do not rewrite signed contracts or existing package-course assignments; incompatible future edits are rejected with instructions to correct the contract first.
- Do not change approved prices, invoices, receipts, payments or package lesson balances.
- Do not change attendance, payroll or scheduling logic.

## Verification

- 25 focused Full Care pricing, contract, correction, scope, sign-page and package-course transition tests passed.
- `npm run build` passed for all 240 application pages.
- Production read-only audit found 3 IB/AP packages and 0 unsigned standard-tier Full Care mismatches before release.

## Risk

Low. The change adds a conservative preparation-time validation based on existing package-course assignments and does not mutate operational or financial records.
