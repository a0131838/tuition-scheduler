# TASK-20260414-ux-batch2-receipts-expense-coordination

## Why

The 2026-04-14 UX review showed that the system’s next friction points are no longer missing actions, but heavy first screens and incomplete workspace isolation on three high-frequency operations pages: receipt approvals, expense claims, and student coordination.

## Scope

- add a clearer queue-focus strip to the receipt-approval workbench before the heavier controls
- move expense-approval config out of the first-screen action area and below the live work queues
- make the dedicated student coordination page behave like a true light-shell workspace by hiding unrelated long-form student sections
- update the written UX review doc so later batches continue from the same shipped baseline

## In Scope Details

- receipt approvals:
  - current-work-focus strip with mode, scope, blockers, and next-best item
  - queue control chips showing live counts
- expense claims:
  - keep submitted review and finance queues first
  - place approval config after the active work areas
- student coordination:
  - keep only coordination-specific controls when `/admin/students/[id]/coordination` is open
  - hide calendar, enrollments, packages, attendance, upcoming sessions, quick schedule, and edit-student sections in coordination-only mode

## Out of Scope

- changing receipt approval rules
- changing invoice math or payment-proof logic
- changing expense-claim approval decisions or payment grouping
- changing scheduling-coordination matching logic
- redesigning the full admin navigation system

## Acceptance

- receipt approvals should feel more like a processing desk and less like a heavy mixed-mode page
- expense claims should prioritize active approval work before low-frequency config
- the dedicated student coordination page should no longer feel like the long student detail page with a coordination section attached
- the UX review doc should reflect the second shipped batch
