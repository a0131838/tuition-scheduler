# TASK 2026-05-13 - Manager Quality Desk One-Page Print

## Context

The first Manager Quality Desk print preview included unrelated admin content such as ledger alerts and action links, and the grouped screen tables spilled onto a second page.

## Scope

- Add a print-only compact Lead Desk table.
- Hide all admin chrome, alerts, reflection forms, and quality snapshots during printing.
- Force A4 landscape print layout with tighter spacing.
- Keep the normal screen page unchanged.

## Verification

- `npx tsc --noEmit`
- `npm run build`
- Playwright generated a PDF for `/admin/manager/quality?date=2026-05-13`.
- `pypdf` confirmed the generated PDF has 1 page.
- PDF text check confirmed the Lead Desk schedule is included and unrelated content is excluded.
