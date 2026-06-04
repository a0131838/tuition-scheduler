# TASK-20260604 School Application Sealed Contract

## Context

School application agreements are application-service contracts, not lesson or hourly-service contracts. The first formal PDF version still displayed `Service hours / 服务时数`, which could make parents think the agreement promised a fixed number of teaching or support hours.

Management also needs a final contract version after the parent signs: parent-signed first, then company-sealed for the file sent back to the family.

## Change

- Removed the service-hours field from the school application admin form.
- Saved school application drafts with `serviceHours: null` so new agreements do not carry service-hour wording.
- Updated the school application PDF wording so service scope is limited by the selected school count and school list, not by hours.
- Added `?seal=1` support to the school application PDF export route.
- Added a `Sealed PDF / 盖章版合同` link after the parent has signed.
- Reused the existing `public/gt_edu_seal.png` company seal asset in the agency signature box.

## Verification

- `npx tsc --noEmit --pretty false`
- Generated sample signed and sealed school application PDFs locally.
- Rendered the sealed PDF and confirmed:
  - `Service Hours`, `service hours`, and `服务时数` are absent.
  - `SCHOOL APPLICATION SUPPORT SERVICES AGREEMENT` and `APPENDIX A - REFUND POLICY` are present.
  - The company seal appears in the agency signature box.

## Risk

Low. This change is limited to school application agreement PDF wording/export and the school application admin form. It does not change invoice numbering, receipt approval, lesson balances, attendance, scheduling, payroll, partner settlement, or Business Accounts.
