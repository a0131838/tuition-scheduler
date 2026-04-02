# TASK-20260402 Feedbacks Context Return

## Goal

Make the admin feedback desk feel more task-oriented by keeping operators anchored to the feedback card or overdue session they just handled, instead of refreshing the whole page with no visible context.

## Scope

- `app/admin/feedbacks/page.tsx`
- `app/admin/feedbacks/MarkForwardedFormClient.tsx`
- `app/admin/feedbacks/ProxyDraftFormClient.tsx`
- release documentation updates for the same ship

## Changes

1. Mark forwarded flow
- after marking a feedback as forwarded, switch to the forwarded queue
- keep the handled item highlighted when it is still visible
- show a flow card with a shortcut back to the next pending item

2. Proxy draft flow
- after creating or updating a proxy draft, switch to the proxy queue
- keep the same session highlighted when it is still visible
- show a flow card with a shortcut back to the missing queue

3. Feedback card anchors
- add stable anchors for feedback cards and overdue-session cards
- use URL params instead of hidden local state so refreshes keep the same context

## Non-goals

- no feedback content rule changes
- no forward-marking rule changes
- no proxy-draft persistence rule changes
- no route or API contract changes

## Validation

- `npm run build`
- local logged-in QA on a fresh dev instance confirmed the forwarded flow card appears and offers `Open next pending item`
- local logged-in QA confirmed unresolved proxy/forward flows still keep their safer queue-return links
- source verification confirmed feedback and overdue cards now render stable anchors plus focus styling when return params are present

## Release notes

- Release ID: `2026-04-02-r09`
- Risk: low
- Rollback: revert this release if forwarded/proxy actions stop returning operators to a useful queue context, or if focus params cause the wrong card to highlight
