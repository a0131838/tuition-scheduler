# TASK-20260407-final-report-pdf-submission-gate-and-empty-level-pass

## Goal

Tighten the parent-facing `Final Report` PDF so it only appears as a formal family handoff after the teacher has actually submitted the report, and remove system placeholder copy from the exported PDF when `Final level / 最终水平` is still empty.

## Scope

- hide `Download PDF` for non-submitted final reports in the admin workbench
- return a guarded response if someone tries to open the final-report PDF route before submission
- remove the `Added by teacher / 由老师填写` placeholder from the PDF summary row when `finalLevel` is empty
- keep all teacher draft fields, delivery/share logic, and report storage unchanged

## Files

- `app/api/admin/final-reports/[id]/pdf/route.ts`
- `app/admin/reports/final/page.tsx`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Validation

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- confirm `/admin/reports/final` only shows `Download PDF` for `SUBMITTED` or `FORWARDED`
- confirm exported PDFs no longer show the `Added by teacher / 由老师填写` fallback when final level is blank
