# TASK-20260323 Upload Access Recovery

## Goal
- Restore accessibility of existing uploaded files (`/uploads/*`) without changing billing/approval business logic.
- Ensure upload recovery scanner can read both current and legacy billing setting keys.

## Scope
- `app/admin/recovery/uploads/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- No finance workflow rule change.
- No schema change.
- No modification of receipt/payment calculation logic.

## Validation
1. `npm run build` passes.
2. `https://sgtmanage.com/uploads/payment-proofs/3e124342-fb43-415a-b15e-810f5ff23c68/1774269713216_6b67ed17.jpg` returns `200`.
3. Sample `/uploads/tickets/*` URLs return `200`.
4. Recovery page loads and includes package payment scan via current key.

## Status
- In progress: prepare deploy commit and sync server to latest branch head.
