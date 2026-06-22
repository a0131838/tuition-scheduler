# TASK 2026-06-22 Student Package Utilization Excel Filename

## Context

Finance reported that the student package utilization preview worked, but the Excel download returned HTTP 500 for a Chinese student name such as `王玫卓`.

## Root Cause

The export route placed the full Chinese filename directly in the `filename="..."` portion of the `Content-Disposition` response header:

`student-package-utilization-王玫卓-2026-06-22.xlsx`

The runtime requires that header value to be ByteString-safe. Non-ASCII Chinese characters caused:

`Cannot convert argument to a ByteString`

## Change

- Keep the UTF-8 filename in `filename*=UTF-8''...`.
- Use an ASCII-only fallback in `filename="..."`.
- Leave the report query, Excel workbook content, preview calculation, and attendance rows unchanged.

## Verification

- Reproduced the production HTTP 500 for the `王玫卓` export.
- Confirmed the production error log pointed to non-ASCII response header conversion.
- `npx tsc --noEmit --pretty false`
- `npm run build`

## Non-Goals

- No change to attendance, package balance, package ledger, billing, receipts, contracts, scheduling, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.
