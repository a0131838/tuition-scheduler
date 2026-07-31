# TASK-20260731-business-finance-documents

## Context

Finance reported that invoices issued to Shanghai Xinzhuo Si did not appear in the central Finance Documents list. Read-only production checks confirmed the invoices were not missing: they were stored correctly in the isolated Business Accounts workspace. The central list only aggregated Parent Billing and Partner Billing, so every Business Account document was omitted.

## Production Evidence

- Business Account: `上海新卓思教育科技有限公司` (`shanghai-xin-zhuo-si`).
- `RGT-202607-0004`: issued 2026-07-13, SGD 18,440, paid, receipt `RGT-202607-0004-RC`.
- `RGT-202606-0017`: issued 2026-06-23, SGD 16,850, paid, receipt `RGT-202606-0017-RC`.
- `RGT-202606-0015`: issued 2026-06-23, SGD 14,000, paid, receipt `RGT-202606-0015-RC`.
- No Shanghai Xinzhuo Si invoice exists in Partner Billing, confirming this is an aggregation omission rather than a partner-filter error.

## Change

- Added `BUSINESS` as a Finance Documents channel.
- Added formal Business Account invoices and generated receipts to the central document rows.
- Kept drafts out of formal-document lookup.
- Represented issued, paid, partial, and void states without changing source records.
- Added Business channel and Void status filters and bilingual labels.
- Linked invoice and receipt rows to their existing PDFs and Business Accounts workspace.
- Included Business rows and labels in filtered Excel exports.
- Corrected the Excel autofilter range so it covers all exported columns.

## Non-goals

- No Business Account record is copied, moved, edited, reissued, or renumbered.
- No invoice, receipt, payment proof, or approval is created by deployment or verification.
- No change to Business Account write actions, Partner Billing, Parent Billing, Credit Notes, package balances, attendance, payroll, scheduling, or permissions.

## Verification

- `node --test --import tsx tests/finance-documents.test.ts` passed 8 tests.
- Six focused finance and billing suites passed 30 tests.
- `npx tsx --test tests/*.test.ts` passed all 301 repository tests.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- `npm run build` passed and generated 231 pages.

## Risk

Low. The change extends only read-time aggregation and export formatting. Source-of-truth Business Account records and all finance write paths remain unchanged.

## Release Record

- Release ID: `2026-07-31-r301`.
- Deployment status: ready.
- Rollback point: `b38c2417ee65fc2264697bdbf406b1c3a30f767c`.
