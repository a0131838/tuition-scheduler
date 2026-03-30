# TASK-20260330-parent-payment-proof-route

## Summary

- Add a controlled admin file route for parent payment proof records.
- Switch parent payment proof links/previews in receipt approvals to use record-id based access instead of direct static relative paths.

## Why

- The UI shows the original uploaded filename, but the actual stored server filename is randomized.
- Direct static path opening makes filename mismatch look like a missing upload when the record itself is valid.
- A record-id route gives one stable open path and keeps lookup logic centralized.

## Scope

- `app/api/admin/parent-payment-records/[id]/file/route.ts`
- `app/admin/receipts-approvals/page.tsx`
- release docs

## Guardrails

- Do not change parent billing storage format.
- Do not change upload, receipt creation, or approval business rules.
- Only change how admin opens/previews parent payment proof files.

## Verification

- `npm run build`
- Admin receipt approvals opens parent payment proof via the new route.
- Existing valid payment-proof files remain reachable through the controlled route.

## Status

- Completed locally; ready for deploy.
