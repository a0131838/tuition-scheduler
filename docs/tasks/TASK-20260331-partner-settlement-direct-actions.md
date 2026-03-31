# TASK-20260331 Partner Settlement Direct Actions

## Goal

Reduce one extra click in the partner settlement page by letting the sticky selected-item panel run the primary action directly, and add direct warning-type shortcuts inside the integrity workbench.

## Scope

- Partner settlement page only:
  - `app/admin/reports/partner-settlement/page.tsx`
- Release notes:
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`

## Changes

1. `Selected item / 当前处理项`
- Keep record review as a direct link into billing workspace.
- Allow online settlement candidates to submit `createOnlineSettlementAction` directly from the sticky panel.
- Allow offline settlement candidates to submit `createOfflineSettlementAction` directly from the sticky panel.
- Keep finance users read-only.

2. `Integrity workbench / 异常工作台`
- Add `Review first row / 查看首条` links for:
  - missing feedback warnings
  - status excluded warnings
- Jump back into the focused warning flow on the same page.

## Non-goals

- No change to settlement formulas.
- No change to permission rules.
- No change to invoice or receipt flows.
- No change to revert behavior.

## Validation

- `npm run build`

## Status

- Completed locally and deployed.
