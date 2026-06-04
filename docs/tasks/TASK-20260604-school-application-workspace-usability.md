# TASK-20260604 School Application Workspace Usability

## Context

After the school application agreement flow went live, operators found the workspace uncomfortable:

- New drafts copied the student name into the parent-name field.
- Opening from the left navigation still showed `Back to student`, even though the operator came from the school application list.
- Form refreshes could reset the sidebar scroll position to the top.
- Older draft rows created before the fix could still display the student name as the parent name.

## Change

- New school application drafts now leave `parentName` blank instead of copying the student name.
- Existing draft rows that only contain the old student-name default and no parent contact details display the parent-name input as blank.
- The school application list now opens student workspaces with `from=school-applications`.
- The student school-application workspace shows `Back to school applications / 返回学校申请列表` when opened from the list, and preserves that source through save/sign/void/delete redirects.
- Added a small sidebar scroll-memory client for admin pages so the left navigation keeps its scroll position after form refreshes.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Code search confirmed no visible `Service hours / 服务时数` UI remains in the school application workspace.

## Risk

Low. This change is UI/default-state only for the school application workspace. It does not change school application invoices, receipts, contract signing, lesson package balances, attendance deduction, scheduling, payroll, partner settlement, or Business Accounts.
