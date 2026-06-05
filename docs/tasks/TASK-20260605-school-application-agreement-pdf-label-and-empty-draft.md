# TASK-20260605-school-application-agreement-pdf-label-and-empty-draft

## Request

The school application workspace had a generic `PDF` button that was unclear. Clicking it on an empty draft opened a browser `HTTP ERROR 500`.

## Implementation

- Renamed the generic `PDF` link to `Agreement PDF / 合同PDF`.
- Renamed the signed sealed link to `Sealed Agreement PDF / 盖章合同PDF`.
- When a draft has no parent information or no school rows, the workspace now shows explanatory text instead of a clickable agreement PDF link.
- The export route now catches not-ready PDF errors and returns HTTP `400` with a readable message instead of an unhandled `500`.

## Verification

- `npm run build`
- `npx tsc --noEmit --pretty false`
- Created a temporary empty school application draft and called the export route directly.
- Confirmed the export route returns `400 Agreement PDF is not ready` instead of `500`.
- Cleaned up temporary rows.

## Risk Notes

- This does not change agreement PDF content.
- This does not change signing, invoice numbering, receipt approval, lesson package balances, attendance, scheduling, payroll, partner settlement, transport billing, or Business Accounts.
