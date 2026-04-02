# TASK-20260402 Students Desk Memory

## Goal

Reduce repeated queue and filter rebuilding on the admin students workbench by remembering the operator's last desk context, then restoring that context when the page is reopened without explicit URL params.

## Scope

- `app/admin/students/page.tsx`
- `app/admin/students/AdminStudentsClient.tsx`
- release documentation updates for the same ship

## Changes

1. Remembered student-desk parsing
- extend the existing remembered students cookie from legacy `view`-only values to a normalized query-string payload
- whitelist only:
  - `view`
  - `q`
  - `sourceChannelId`
  - `studentTypeId`
  - `pageSize`
- keep pagination page numbers and one-shot flow params out of the remembered state

2. Server-side student desk restore
- restore the remembered queue and lightweight filters when `/admin/students` opens without explicit URL params
- keep explicit URL params higher priority than remembered state
- continue supporting legacy plain-cookie values so existing remembered queue behavior does not break

3. Client-side cleanup
- remove the old client redirect that only remembered `view`
- rely on the server-rendered restored context instead, so the page no longer performs a second jump after load
- update the helper hint to describe “queue + filters” instead of only “view”

## Non-goals

- no student creation logic changes
- no student deletion logic changes
- no filter semantics changes
- no pagination semantics changes
- no student detail or enrollment/package workflow changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3319` confirmed:
  - `/admin/students` restores `view=all&q=赵&sourceChannelId=...&studentTypeId=...&pageSize=50` from the remembered cookie when opened without URL params
  - the resumed-desk banner renders on the plain reopen path and says queue plus filters were restored
  - explicit `view=today` and explicit `q=abc` URLs still win and suppress the resumed-desk banner

## Release notes

- Release ID: `2026-04-02-r16`
- Risk: low
- Rollback: revert this release if `/admin/students` starts reopening the wrong queue/filter set, if explicit URL params stop taking precedence over remembered state, or if the student desk begins redirecting after load because the old client-side resume behavior comes back
