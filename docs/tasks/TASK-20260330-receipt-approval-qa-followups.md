# TASK-20260330-receipt-approval-qa-followups

- Date: `2026-03-30`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Follow up on real browser QA findings from the receipt approval page after the recent queue/workflow polish releases.

## Goal

Keep the current approval workflow unchanged while fixing three usability regressions found in live QA:

1. Queue risk badges and selected receipt risk guidance must stay consistent.
2. Bilingual labels must render once, not twice.
3. `Only my actions / 只看我待处理的` should not default to another queue bucket when the operator has no pending items.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- release documentation only

## Non-Goals

- no approval-rule changes
- no permission changes
- no finance data-flow changes
- no new receipt creation or payment-proof workflows

## Implementation Notes

- Reused the selected row's queue-level `paymentFileMissing` and payment-proof presence data for the detail-side risk card.
- Switched the page's repeated bilingual strings away from already-bilingual `t(...)` calls where they were rendering duplicated copy in bilingual mode.
- Changed default selected-row behavior to respect the currently visible bucket, so `MINE` with zero items does not silently fall back to `other open items`.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify on `/admin/receipts-approvals` that:

- a row marked `File missing / 文件缺失` in the queue shows the same problem in the selected detail panel
- queue bucket headings and fix shortcut labels render once in bilingual mode
- `Only my actions / 只看我待处理的` shows an empty-state message instead of selecting another open row when count is zero
