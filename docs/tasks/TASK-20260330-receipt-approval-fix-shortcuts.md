# TASK-20260330 Receipt Approval Fix Shortcuts

## Goal
- Make the receipt approval queue faster to recover when proof files are missing or wrong.
- Keep the approval workflow unchanged while reducing clicks for the most common repair scenarios.

## Scope
- `app/admin/receipts-approvals/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risk Boundary
- Do not change approval sequencing or permissions.
- Do not change receipt creation, billing linkage, or finance data flow.
- Only improve queue shortcuts and ordering priority for risky rows.

## Validation
1. `npm run build` passes.
2. Risky parent rows show a bilingual fix shortcut in the queue.
3. Missing proof and file-missing rows sort ahead of generic review items.
4. Selected receipt actions still behave the same.

## Status
- Ready to deploy on the current production branch lineage.
