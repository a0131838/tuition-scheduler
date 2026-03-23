# TASK-20260323 Ledger Note Readability

## Goal
- Make package ledger notes understandable for ops/finance users without reading technical key-value text.
- Keep existing posting logic unchanged while improving readability for old and new note formats.

## Scope
- `lib/package-ledger-note.ts`
- `app/admin/packages/[id]/ledger/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Display and wording change only.
- No change to package minutes calculation, transaction kind, or write path.
- No schema migration.

## Validation
1. `npm run build` passes.
2. Legacy note pattern like `manual_reconcile...;reason=...;actual=...;expected=...;diff=...` is displayed as readable Chinese lines.
3. Existing abnormal note format `[ABNORMAL_TXN]` is still parsed and shown with structured fields.

## Status
- In progress: deploying to production and verifying rendered ledger notes.
