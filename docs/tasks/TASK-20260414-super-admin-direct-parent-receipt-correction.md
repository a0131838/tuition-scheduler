# TASK-20260414-super-admin-direct-parent-receipt-correction

## Why

Finance occasionally needs an emergency correction on an already approved parent receipt, such as a receipt that should show `4080` but was approved as `4000`. The existing revoke-and-redo flow is safer by default, but in a few exceptional cases the business wants `zhao hongwei` to fix the approved receipt directly without reopening approvals.

## Scope

- add a strict super-admin-only direct correction form on parent receipt details
- keep the existing revoke-and-redo path in place for safer normal operations
- preserve manager and finance approvals after the direct correction
- write every direct correction into audit logs with before/after values
- keep invoice-level amountReceived ceiling checks so direct edits cannot push total receipted above the linked invoice total

## Editable Fields

- receipt date
- received from
- paid by
- amount
- gst amount
- total amount
- amount received
- note

## Out of Scope

- partner receipts
- changing receipt numbers or linked invoice / payment proof
- resetting approvals automatically after a direct correction
- bulk correction tools

## Acceptance

- only `zhao hongwei` can see and use the direct correction form
- approved parent receipts can be corrected in place from the receipt detail drawer
- the receipt keeps its approval status after the correction
- an audit entry records the before/after values for every direct correction
- if the edited amountReceived would exceed the linked invoice total, the save is blocked
