# TASK-20260604 School Application Void Delete

## Request

Admins expected a school application service record to be removable after choosing `Void`, but the student school-application workspace only exposed the void action.

## Implementation

- Added a guarded delete service for school application service records.
- Allowed deletion only when the record status is `VOID`.
- Blocked deletion when the voided record still has `invoiceId` or `invoiceNo`, so invoiced records remain available for audit history.
- Added a `Delete voided / 删除已作废` button on the student school-application workspace for voided records without invoice linkage.
- Added an explanatory audit message for voided records that are linked to invoices.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test with a temporary student:
  - confirmed a non-void draft cannot be deleted
  - voided the draft and confirmed it can be deleted
  - created a voided record with an invoice marker and confirmed deletion is blocked
  - cleaned up temporary test data and confirmed no temporary students remain

## Risk

Low. The delete action is limited to school application service records that are already voided and not invoice-linked. Existing invoice, receipt, lesson package balance, signing, attendance, payroll, partner settlement, and Business Accounts behavior is unchanged.
