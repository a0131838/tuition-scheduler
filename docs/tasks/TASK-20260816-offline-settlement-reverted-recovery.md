# TASK-20260816-offline-settlement-reverted-recovery

## Context

Three New Oriental students in the July 2026 offline monthly settlement were included in invoice `RGT-202608-0013`. After that invoice was deleted and the settlement records were reverted, the students disappeared from the offline candidate list even though their lesson, attendance and feedback records were intact.

The page treated every historical settlement row as blocking, including `REVERTED`, and the create action rejected any existing row. This left reverted records unable to return to the queue or be submitted again.

## Change

- Limit candidate blocking to `PENDING`, `INVOICED` and `CANCELLED` settlement statuses.
- Let `REVERTED` offline monthly records return to the candidate list.
- Reuse a matching reverted record on resubmission instead of creating a duplicate.
- Recalculate eligible lesson hours and amount from current attendance and feedback data.
- Clear `revertedAt` and `revertedBy` only when staff deliberately resubmit the settlement.
- Add a regression test for blocking and reverted settlement statuses.

## Non-goals

- Do not alter existing lessons, attendance, feedback, package balances, invoices or receipts.
- Do not automatically resubmit or invoice the three affected students.
- Do not change online package-end settlement behavior.
- Do not add or migrate database fields.

## Verification

- `npx tsx --test tests/partner-settlement.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

## Risk

Low. The display query excludes only `REVERTED` records from the blocking set, and the write path follows the existing online-settlement reactivation pattern. A business write occurs only after an authorized staff member deliberately submits the reverted offline candidate again.
