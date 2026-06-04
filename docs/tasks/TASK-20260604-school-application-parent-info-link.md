# TASK-20260604-school-application-parent-info-link

## Request

Add the school application parent information collection flow in one pass:

- provide a dedicated parent information link for school application services
- reuse existing student-contract, parent-intake, or previous school-application parent details when available
- let the parent submit contact and current school/grade details before the formal signing link
- write submitted details back to the school application draft and student profile
- keep the flow separate from lesson package balances, invoice numbering, receipts, and normal contracts

## Implementation

- Added nullable parent-info token/status fields to `SchoolApplicationService`.
- Added school-application event types for parent-info link sent, viewed, and submitted.
- Added `prepareSchoolApplicationParentInfoLink`, `getSchoolApplicationParentInfoDefaults`, `markSchoolApplicationParentInfoViewed`, and `submitSchoolApplicationParentInfo`.
- Added `/school-application-info/[token]` public page for parents to confirm details.
- Added a parent-info link card in the school application admin workspace.
- Parent submission updates:
  - school application `parentInfoJson`
  - school application `billTo` when it still matches the student/default value
  - student `school` and `grade` when provided
  - student `note` by appending a dated school-application note instead of overwriting existing notes

## Verification

- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test:
  - created a temporary student
  - created a school application draft
  - generated the parent info link
  - submitted parent details through the service function
  - verified parent info and `billTo` were saved
  - verified student school, grade, and note were updated
  - verified the service billing case stayed at `0` total minutes and `0` remaining minutes
  - cleaned up the temporary student, school application, and service package

## Risk Notes

- The migration adds nullable fields only, so existing school application rows remain valid.
- The parent-info page is a public token page, matching the existing parent contract/intake pattern.
- The write-back intentionally does not touch normal lesson packages, attendance, invoice numbering, receipt approval, payroll, partner settlement, transport billing, or Business Accounts.
