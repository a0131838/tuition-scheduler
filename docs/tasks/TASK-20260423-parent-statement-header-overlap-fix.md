## Task

Fix the exported parent statement PDF header so the bilingual title no longer overlaps the company name and generated-date lines when the title wraps.

## Why

- The current `Statement of Account / 对账单` header can wrap into two lines.
- The route still positions the company name and generated date using fixed vertical offsets.
- Downloaded PDFs therefore show visible overlap in the top-right header block.

## Scope

- Update the parent statement export route only.
- Keep statement data, numbering, billing calculations, and other PDF sections unchanged.
- Make the header layout depend on the measured title height instead of fixed spacing.

## Files

- `app/api/exports/parent-statement/[id]/route.ts`
- `docs/tasks/TASK-20260423-parent-statement-header-overlap-fix.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Expected Result

- The bilingual statement title can wrap without colliding with the company name.
- The generated date line sits below the company line with stable spacing.
- The top header block keeps working even if future title copy becomes taller.

## Verification

- `npm run build`
- Export a parent statement PDF and confirm the top-right header block no longer overlaps.
