# TASK-20260408-final-report-teacher-form-parent-pdf-alignment-pass

## Goal

Align the teacher-side `Final Report` writing page more closely with the parent-facing PDF so teachers can see the same narrative structure they are actually authoring.

## Scope

- add a short note that explains which sections become the parent-facing PDF body
- rename teacher form sections to match the softer parent-facing PDF headings
- move `initial goals` below the family-facing summary blocks so the writing order better matches the exported PDF
- keep `teacher internal note` clearly separated as an internal-only field
- keep all report data fields, submission logic, and delivery/share behavior unchanged

## Files

- `app/teacher/final-reports/[id]/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- teacher final-report form should show the parent-facing field note and the softer section titles
- admin/login health check should stay `200`
