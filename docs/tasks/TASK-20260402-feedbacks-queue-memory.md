# TASK-20260402 Feedbacks Queue Memory

## Goal

Reduce repeated queue rebuilding on the admin feedback desk by remembering the operator's last queue and student scope, then restoring that context when the page is reopened without explicit URL params.

## Scope

- `app/admin/feedbacks/page.tsx`
- release documentation updates for the same ship

## Changes

1. Remembered feedback queue parsing
- add a small server-side parser for normalized feedback queue state
- whitelist only:
  - `status`
  - `studentId`
- keep flow-specific params out of the remembered state

2. Feedback desk resume logic
- restore the last remembered queue when `/admin/feedbacks` opens without explicit URL params
- restore the last remembered student scope together with the queue when it exists
- keep explicit URL params higher priority than remembered state

3. Resume hint
- show an explicit “resumed your last feedback queue” hint when remembered state is used
- provide a direct shortcut back to the default desk
- suppress the banner on feedback-flow return pages so forwarded/proxy success guidance keeps priority

## Non-goals

- no feedback content changes
- no forwarded-mark behavior changes
- no proxy-draft behavior changes
- no teacher-side feedback workflow changes
- no card focus / anchor return logic changes

## Validation

- `npm run build`
- fresh local logged-in QA on `http://127.0.0.1:3316` confirmed:
  - `/admin/feedbacks` restores `status=pending` from cookie when opened without URL params
  - `/admin/feedbacks` restores `status=pending&studentId=b54eae8f-461f-4aae-9a22-8ec7a1033c8a` from cookie when opened without URL params
  - the resumed queue banner renders on the plain queue-open path and does not appear on `feedbackFlow=forwarded` return pages
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- logged-in live QA confirmed production `/admin/feedbacks` restores the remembered queue/student scope and still suppresses the resume banner on feedback-flow return pages

## Release notes

- Release ID: `2026-04-02-r13`
- Risk: low
- Rollback: revert this release if `/admin/feedbacks` starts reopening the wrong queue, if explicit URL params stop taking precedence over remembered state, or if feedback-flow return pages lose their success guidance because the resume banner overrides them
