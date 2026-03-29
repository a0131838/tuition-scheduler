# TASK-20260329 AppSetting Sanitize Guard

## Goal
- Add a lightweight guardrail after the receipt-approval hotfix so future `AppSetting` callers do not treat `sanitize` input as a raw JSON string.

## Scope
- `lib/app-setting-lock.ts`
- `tests/app-setting-lock.test.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change runtime business behavior.
- Do not change JSON data shape or persistence strategy.
- Only document the helper contract and add regression coverage.

## Validation
1. `npm run test:backend` passes.
2. `loadJsonAppSettingForDb` regression test confirms `sanitize` receives parsed JSON values.

## Status
- Ready to deploy on the current production branch lineage.
