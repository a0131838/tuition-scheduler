# TASK-20260423 Contract Void Draft Delete And History Cleanup

## Goal

Keep package billing contract workspaces clean by:

- allowing deletion of truly disposable void drafts
- keeping signed/invoiced void contracts as audit history
- preventing old void rows from blocking creation of the next usable contract

## Scope

- add a safe delete path for `VOID` contract drafts
- allow deletion only when the void contract:
  - was never signed
  - never created or linked an invoice
- treat `VOID` rows as collapsed history in package billing instead of the current active contract
- keep renewal contracts under the same rule set

## Non-goals

- no deletion of signed void contracts
- no deletion of invoiced void contracts
- no change to finance gate, receipt, invoice, or partner-settlement logic

## Key Files

- `lib/student-contract.ts`
- `app/admin/packages/[id]/billing/page.tsx`
- `docs/tasks/TASK-20260423-contract-void-draft-delete-and-history.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risks

- Low. This change only affects contract workspace cleanup and visibility.
- Signed or invoiced void contracts remain visible in history for audit and renewal-reference safety.

## Verification

- `npm run build`
- create a new void draft on a direct-billing package and confirm it can be deleted
- confirm deleting a void draft removes it completely and the package billing page returns to the normal "create contract" state
- confirm void contracts that were signed or invoiced stay in the collapsed history section and do not show the delete action
