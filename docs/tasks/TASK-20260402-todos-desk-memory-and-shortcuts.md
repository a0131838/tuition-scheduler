# TASK-20260402 Todos Desk Memory And Shortcuts

## Goal

Reduce repeated todo-desk setup on the admin Todo Center by remembering the operator's last desk context, then restoring it on plain reopen while also giving a clearer first-screen path back to the next likely action.

## Scope

- `app/admin/todos/page.tsx`
- release documentation updates for the same ship

## Changes

1. Remembered todo-desk parsing
- add a small server-side parser for normalized todo workbench state
- whitelist only:
  - `warnDays`
  - `warnMinutes`
  - `pastDays`
  - `showConfirmed`
  - `includeConflicts`
- keep transient params like pagination out of the remembered state

2. Todo desk restore
- restore the remembered thresholds and toggles when `/admin/todos` opens without explicit URL params
- keep explicit URL params higher priority than remembered state
- persist the normalized remembered desk state with the shared workbench query client

3. First-screen shortcuts
- show a resumed-desk banner when remembered state is used
- add a first-screen shortcut bar that links back to the currently active high-priority sections:
  - today's attendance queue
  - overdue follow-up
  - system checks
  - reminder desk

## Non-goals

- no attendance task calculation changes
- no reminder confirmation logic changes
- no conflict-audit logic changes
- no deduction repair logic changes
- no renewal-alert logic changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3320` confirmed:
  - `/admin/todos` reopens with the remembered desk context and shows the resumed-desk banner when no explicit URL params are present
  - the next-step shortcut bar renders on the first screen and points back to the active todo sections
  - explicit `warnDays=5` and explicit `pastDays=14` URLs suppress the resumed-desk banner so deep links keep priority

## Release notes

- Release ID: `2026-04-02-r17`
- Risk: low
- Rollback: revert this release if `/admin/todos` starts reopening with the wrong thresholds/toggles, if explicit URL params stop taking precedence over remembered state, or if the new shortcut bar points operators to the wrong section anchors
