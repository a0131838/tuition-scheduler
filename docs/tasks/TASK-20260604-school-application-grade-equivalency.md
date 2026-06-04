# TASK-20260604 School Application Grade Equivalency

## Request

Some British schools use `Year 13`, which is equivalent to `Grade 12` in other school systems. The school application workflow needs to keep the school's own grade wording while also preserving an internal equivalent level.

## Implementation

- Reworked school application grade options into school-facing levels such as `Year 13`, `Grade 12`, `Secondary 4`, and AEIS levels.
- Added equivalent level options such as `Grade 12 equivalent`.
- Added automatic equivalent-level inference when staff select a school grade and leave equivalent level as auto/default.
- Stored `equivalentLevel` inside each school application row JSON payload.
- Updated admin entry, parent signing page, and PDF output to show `School Grade (Equivalent Level)`.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run build`
- Smoke test:
  - created a temporary no-package student
  - selected `Dulwich College (Singapore)` with `Year 13`
  - saved the draft
  - confirmed `Year 13` automatically inferred `Grade 12 equivalent`
  - prepared the sign link
  - generated the PDF
  - cleaned up the temporary records

## Risk

Low. Existing school application rows without `equivalentLevel` still load because the field is optional. New rows can use the automatic mapping, and staff can override the equivalent level when needed.
