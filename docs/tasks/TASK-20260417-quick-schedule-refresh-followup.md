# TASK-20260417-quick-schedule-refresh-followup

## Why

Ops reported that the quick schedule modal could appear inconsistent until a full page refresh. Investigation of the Coco + Jasmine case showed the target lesson on `2026-04-27 17:30-19:00` already existed in the database, so this was not a broad scheduling-rule regression. The more plausible UX gap is that clicking `Find Available Teachers / 查找可用老师` did not explicitly force a fresh server render of the candidate snapshot, which could leave the modal showing stale availability results until the user refreshed the page manually.

## Scope

- make the quick schedule modal refresh server-rendered candidate results whenever ops clicks `Find Available Teachers / 查找可用老师`
- preserve the current student-detail hash restore behavior while refreshing
- keep scheduling rules, duplicate checks, teacher conflict checks, room conflict checks, and package validation unchanged

## Files

- `app/admin/_components/QuickScheduleModal.tsx`
- `docs/tasks/TASK-20260417-quick-schedule-refresh-followup.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Verification

- `npm run build`
- browser/data verification:
  - confirm Coco + Jasmine `2026-04-27 17:30-19:00` already exists in the database
  - confirm quick schedule `Find Available Teachers / 查找可用老师` now forces a refresh of the candidate snapshot instead of depending on a manual page reload
  - confirm student detail still returns to the quick schedule section correctly after the refresh

## Risk

Low. This is a quick-schedule UI refresh follow-up only. It does not change teacher availability rules, room rules, package rules, repeat scheduling logic, or appointment creation behavior; it only makes the modal re-fetch fresh server-rendered results after the user requests a new candidate lookup.
