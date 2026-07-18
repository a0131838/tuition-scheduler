# TASK-20260718-miniapp-emily-request-intake

## Context

Emily's CS miniapp already allowed staff-assisted Ticket creation, but the entry was a low-priority row among many tools and the form exposed every operational field at once. The Ticket detail also allowed any authenticated employee to complete any parent request, regardless of assignment or sensitivity.

## Change

- Add a dominant CS-only orange home action: “微信群有新的家长消息？立即录入工单”.
- Rebuild intake as three explicit steps: select student/type, record internal message and parent-visible summary, then add optional album/WeChat attachments.
- Keep source, priority, owner, next action and deadline behind “更多设置（通常不用改）”.
- Add completion readiness copy and a final confirmation modal before creation.
- Let ADMIN accounts retain final authority over every request.
- Let CS complete only a low-risk request assigned to their own account.
- Require ADMIN for complaints, finance issues, school affairs, non-owned completion and post-creation reassignment.
- Show the exact close restriction in the miniapp detail instead of exposing an action that will fail.

## Non-goals

- Do not modify `app/admin/**` web pages or web Ticket workflows.
- Do not change Ticket creation fields, parent visibility, notification rules or attachment storage.
- Do not alter scheduling, attendance, packages, finance calculations, payroll or parent permissions.
- Do not create a production Ticket during automated verification.

## Verification

- Focused request-intake tests `3/3`
- Complete miniapp tests `49/49`
- Backend tests `79/79`
- `npx tsc --noEmit`
- Native miniapp JavaScript syntax checks
- `npm run build` (`198` pages)
- `git diff --check`
- Explicit no-`app/admin/**` diff check
- WeChat Developer Tools preview for AppID `wxe7017f8545e8ad49` (`388.1 KB`)

## Rollout gate

- Upload development version `1.0.4` and designate it as the experience version.
- Emily verifies the orange home entry, one no-submit form walkthrough, album/WeChat attachment choices and the manager-close explanation on a physical phone.
- If a real low-risk Ticket is assigned to Emily, verify she can complete it only after entering a parent-visible result.
- Jasmine or Eva verifies one restricted Ticket shows the final completion action under ADMIN.

## Risk

Medium-low. The UI is native-miniapp only. The API change narrows write authority and may reveal historical Tickets whose owner text does not exactly match the CS user's current display name; those Tickets correctly remain manager-closeable. There is no migration and no protected business calculation change.
