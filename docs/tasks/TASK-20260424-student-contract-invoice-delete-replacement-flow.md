# TASK-20260424 Student Contract Invoice Delete Replacement Flow

## Summary

Allow ops to correct a signed-but-unpaid student contract by deleting the old invoice draft, detaching that invoice from the signed contract history, and immediately creating a replacement contract version without forcing the parent to refill profile details.

## Scope

- when a parent invoice draft is deleted from package billing, unlink it from the related signed student contract
- remove any package invoice-approval rows tied to the deleted invoice draft
- downgrade the linked contract from `INVOICE_CREATED` back to signed history with no active invoice reference
- let replacement contract creation ignore old terminal contracts so a new version is actually created
- reuse parent info and business draft defaults from the previous signed contract when creating a replacement version
- expose a direct `Delete old invoice draft / 删除旧发票草稿` action in the signed-result card when no receipt exists yet

## Files

- `lib/student-contract.ts`
- `app/admin/packages/[id]/billing/page.tsx`

## Risk

Medium. This changes the signed-contract correction workflow around invoice deletion and replacement creation, but does not change receipt math, payment proof behavior, partner package rules, or the actual signed-contract PDF content.

## Verification

- `npm run build`
- temporary QA confirmed:
  - signed contract created an invoice draft
  - deleting that invoice draft cleared `invoiceId / invoiceNo / invoiceCreatedAt` from the contract
  - the contract fell back to `SIGNED`
  - creating a replacement first-purchase contract produced a new `CONTRACT_DRAFT`
  - the replacement reused the previous parent profile instead of reopening the parent intake form
