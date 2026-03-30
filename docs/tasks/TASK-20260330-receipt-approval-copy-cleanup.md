# TASK-20260330-receipt-approval-copy-cleanup

- Date: `2026-03-30`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Clean up the remaining duplicated bilingual copy in the selected receipt detail panel after the earlier receipt approval QA follow-up fixes.

## Goal

Keep the selected receipt workflow unchanged while making the operator-facing detail panel read naturally in bilingual mode.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- release documentation only

## Non-Goals

- no approval-rule changes
- no permission changes
- no queue ordering changes
- no finance data-flow changes

## Implementation Notes

- Replaced remaining `t(lang, "en / zh", "en / zh")` style labels with single-source bilingual strings.
- Covered timeline rows, manager/finance action headers, receipt file card, more-actions controls, and revoke labels.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify on `/admin/receipts-approvals` that the selected receipt panel no longer shows doubled labels such as:

- `Created / 创建 / Created / 创建`
- `Receipt file / 收据文件 / Receipt file / 收据文件`
- `More actions / 更多操作 / More actions / 更多操作`
