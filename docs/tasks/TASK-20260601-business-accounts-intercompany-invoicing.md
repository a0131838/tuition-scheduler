# TASK 2026-06-01 Business Accounts Intercompany Invoicing

## Context

Management asked to keep company-level invoicing in SGT Manage for Shanghai Xin Zhuo Si Educational Technology Co. Ltd. and future sales agents, while not affecting the existing New Oriental partner settlement workflow.

Correct Shanghai Xin Zhuo Si information:

- Chinese legal name: 上海新卓思教育科技有限公司
- English legal name: shang hai xin zhuo si Education Technology Co. Ltd.
- Unified Social Credit Code: 91310113MADBXWF54D
- Account type: Intercompany
- Fixed monthly corporate services fee: SGD 14,000

## Change

- Added a separate `Business Accounts / 企业账户` finance workspace.
- Seeded a default Shanghai Xin Zhuo Si business account in an AppSetting-backed store.
- Added monthly document creation with:
  - billing month
  - issue date
  - due date
  - fixed monthly fee
  - variable tutor fee
  - service summary, platforms, personnel, benefit, and tutor-cost summary
- Added PDF exports:
  - Intercompany invoice
  - Monthly service report
- Added sidebar/dashboard links for admin and finance users.

## Boundaries

This release does not change:

- New Oriental partner settlement
- `PartnerSettlement`
- student source handling
- student packages
- parent invoice/receipt workflow
- payroll
- package ledger

## Verification

- `npx tsc --noEmit`
- `npm run build`
- Local sample PDF generation for invoice and service report.
- Text extraction confirmed the invoice includes `shang hai xin zhuo si Education Technology Co. Ltd.` and `91310113MADBXWF54D`.

## Risk

Medium. This adds a new finance workflow and stores monthly business-account documents in `AppSetting`. The risk is isolated because it does not reuse or mutate the existing partner settlement data path.
