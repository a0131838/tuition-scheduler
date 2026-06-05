# TASK-20260605-school-application-parent-info-link-delete

## Request

School application parent information links must be removable, otherwise old public links remain available.

## Implementation

- Added `deleteSchoolApplicationParentInfoLink`.
- The delete action clears:
  - `parentInfoToken`
  - `parentInfoExpiresAt`
  - `parentInfoViewedAt`
- It intentionally keeps:
  - `parentInfoJson`
  - `parentInfoSubmittedAt`
  - application draft data
  - student profile data
- Added a `Delete link / 删除链接` button beside the copied parent info link in the school application workspace.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test:
  - created a temporary student
  - created a school application draft
  - generated a parent information link
  - submitted parent information
  - deleted the link
  - verified the old token no longer resolves
  - verified submitted parent information remains
  - cleaned up temporary rows

## Risk Notes

- This revokes link access only. It does not delete business data.
- It does not touch invoice numbering, receipt approval, lesson package balances, attendance, scheduling, payroll, partner settlement, transport billing, or Business Accounts.
