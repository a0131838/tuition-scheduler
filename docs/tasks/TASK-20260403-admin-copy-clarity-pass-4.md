# TASK-20260403-admin-copy-clarity-pass-4

## Goal

Run a fourth admin copy-clarity pass on high-traffic finance pages so labels and guidance read more naturally without changing any payroll, invoice, or attachment-recovery logic.

## Release Target

- Release ID: `2026-04-03-r06`
- Branch: `feat/strict-superadmin-availability-bypass`
- Status: `LIVE`

## Scope

- `app/admin/reports/teacher-payroll/page.tsx`
- `app/admin/finance/student-package-invoices/page.tsx`
- `app/admin/recovery/uploads/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## What Changed

1. Teacher payroll desk
- Reworded queue states so they read like workflow steps, for example `Waiting for manager approval` and `Waiting for finance confirmation`.
- Reworded the payroll-cycle explainer and owner-only permission notices so they are easier to understand.
- Renamed the finance payout summary card to `Payout-ready currency group`.

2. Student package invoice workbench
- Renamed the page and summary copy to feel more like a workbench instead of a raw form.
- Reworded the preview explanation and most form labels so the invoice fields are clearer at first glance.
- Reworded the recent-invoice table headers and export link copy.

3. Attachment health desk
- Converted the main desk copy to consistent bilingual helper usage.
- Reworded the hero, shortcuts, restore panel, source guide, filter chips, and missing-file table headings.
- Kept all attachment detection and repair routing logic unchanged.

## Guardrails

- No payroll math changes.
- No approval-role or payout-flow changes.
- No invoice creation logic changes.
- No attachment recovery logic changes.
- No storage-path validation changes.

## Verification

- `npm run build`
- Logged-in local QA on `http://127.0.0.1:3334`
  - `/admin/reports/teacher-payroll?month=2026-03&scope=all`
  - `/admin/finance/student-package-invoices`
  - `/admin/recovery/uploads`
- Post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- Logged-in live QA on the same three production pages
