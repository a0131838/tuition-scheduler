# TASK-20260424-owner-delete-unused-parent-intake-links

## Goal

Allow only `zhao hongwei` to delete mistaken parent-intake links from the student list, while protecting any intake that has already been used to create a student, package, or contract.

## Why

- Ops can occasionally create the wrong parent-intake link and want to clean it up.
- Submitted or already-used intake rows should stay preserved as process history.
- The delete action should be tightly scoped to the owner account to avoid accidental cleanup by other staff.

## Scope

- add a server-side delete helper for `StudentParentIntake`
- restrict deletion to `zhaohongwei0880@gmail.com`
- only allow deletion when the intake:
  - has no `studentId`
  - has no `packageId`
  - has no `contractId`
  - is still `LINK_SENT` or already `VOID`
- show `Delete link / 删除链接` only for those eligible rows on `/admin/students`
- collapse already-used links into `Used link history / 已使用链接历史` so the main list only shows active intake links

## Non-goals

- restoring deleted intake links
- deleting submitted or downstream-linked intake rows
- changing student creation, first-purchase, contract, or invoice logic

## Files

- `lib/student-parent-intake.ts`
- `app/admin/students/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- owner account sees `Delete link / 删除链接` only on unused mistaken links
- submitted rows keep history and do not show delete
- non-owner accounts cannot delete through UI or server action
- used rows move into the history section instead of staying in the main active list
