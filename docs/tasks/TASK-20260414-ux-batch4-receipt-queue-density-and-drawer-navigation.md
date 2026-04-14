# TASK 2026-04-14 UX Batch 4

## Goal

Make the receipt approval workbench faster for repeated daily use by:

- reducing queue-card reading cost
- making the detail drawer feel like a true processing cockpit
- making it easier to move through adjacent queue items without losing place

## In Scope

- `app/admin/receipts-approvals/page.tsx`
- release docs

## Required Outcomes

1. Queue cards should show invoice, approval progress, and risk in a compact single-pass line instead of stacked mini paragraphs.
2. The selected receipt drawer should show the user’s current queue position.
3. The drawer should expose explicit previous/next navigation in addition to the existing back-to-list path.
4. Repeated summary lines inside the drawer should be removed where they do not add decision value.

## Guardrails

- Do not change receipt approval permissions or action logic.
- Do not change receipt math, invoice math, or payment proof behavior.
- Keep the workbench data model and queue ordering logic intact.

## Verification

- `npm run build`
- receipt queue cards should be visibly denser and easier to compare
- selected receipt drawer should show queue position and previous/next links
- receipt detail should keep action buttons near the top without redundant summary lines
