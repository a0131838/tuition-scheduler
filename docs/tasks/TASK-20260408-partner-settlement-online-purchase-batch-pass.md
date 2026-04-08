# TASK-20260408 Partner Settlement Online Purchase Batch Pass

## Goal

Change online partner settlement to bill each `PURCHASE` tranche independently, so multiple package purchases for the same student no longer collapse into one settlement item and reverted items can return to the queue cleanly.

## Scope

- Add purchase-batch settlement fields to `PartnerSettlement`:
  - `packageTxnId`
  - `settlementStartAt`
  - `settlementEndAt`
  - `revertedAt`
  - `revertedBy`
- Add `REVERTED` to `PartnerSettlementStatus`
- Build a new helper in `lib/partner-settlement.ts` that:
  - enumerates partner `PURCHASE` tranches
  - allocates attendance consumption FIFO across those tranches
  - returns only fully-consumed online purchase batches as settlement candidates
- Update admin partner-settlement center so online rows are shown per purchase tranche instead of per package snapshot
- Update online settlement creation to bind records to `packageTxnId`
- Update revert behavior so online settlements return to queue rather than being deleted
- Update billing workspace so online invoices only include explicitly selected settlement items
- Carry settlement start/end dates into partner invoice export metadata

## Non-Goals

- No changes to `OFFLINE_MONTHLY`
- No changes to attendance deduction rules
- No changes to student package billing or parent billing
- No changes to partner payment proof storage or receipt workflow

## Output

- Online partner settlement queue now shows one row per purchased package tranche
- Each online settlement row shows purchase date, start date, end date, hours, and amount
- Billing page no longer auto-bundles every pending online settlement item
- Reverting an online settlement keeps the tranche recoverable in queue
- Partner invoice export can show `Course Start / Course End` based on the selected online settlement window

## Validation

- `npm run prisma:generate`
- `npm run build`
- Open `/admin/reports/partner-settlement` and verify online queue rows are split by purchase batch
- Create billing from selected online items only and confirm unselected pending items remain outside the invoice
- Revert an online settlement and verify it returns to queue
- Export a partner invoice and confirm online date windows appear when available
