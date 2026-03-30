# TASK-20260330-receipt-approval-batch-flow-and-risk-tiers

- Date: `2026-03-30`
- Owner: `Codex`
- Status: `Completed locally; ready for deploy`

## Summary

Refine the receipt approval page so operators see clearer “act and continue” review buttons, stronger risk tiers, and a visible return path after using fix flows.

## Goal

Keep the same approval rules while making high-volume receipt review feel more like a focused work queue with clearer next steps.

## Scope

- `app/admin/receipts-approvals/page.tsx`
- release documentation only

## Non-Goals

- no approval-rule changes
- no permission changes
- no receipt creation or finance data-flow changes
- no new receipt state transitions

## Implementation Notes

- Primary review buttons now switch to `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条` when another queue item is available.
- Queue risk badges now separate hard blockers from softer checks with bilingual tiers:
  - `Blocker / 阻塞`
  - `Needs check / 需要核对`
  - `Ready / 可处理`
- Queue rows now include a short bilingual `Risk detail / 风险详情` hint so operators can see whether an item is blocked by missing proof, missing file, or just needs review.
- Fix flows now surface a bilingual return cue so operators can jump back to the same selected receipt after correcting setup elsewhere.

## Validation

- `npm run build`

## Deploy Note

After deploy, verify on `/admin/receipts-approvals` that:

- rows with another pending item available show `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条`
- queue rows distinguish blocker items from general review items
- finance/package fix routes show a clear `Back to selected receipt / 返回当前收据` link
