# TASK-20260409-intake-parent-link-origin-hotfix

## Goal

Fix the external intake response so Emily receives a production parent availability link instead of a `localhost` URL after creating a scheduling coordination ticket.

## Problem

- Ticket creation succeeded.
- Parent availability token creation succeeded.
- The returned absolute URL used `new URL(req.url).origin`, which resolved to an internal `localhost` host behind the production proxy.

## Fix

- Prefer `NEXT_PUBLIC_APP_URL` when present.
- Otherwise resolve the origin from `x-forwarded-host` and `x-forwarded-proto`.
- Only fall back to `new URL(req.url).origin` as the last option.

## Verification

- `npm run build`
- create a real scheduling-coordination ticket through the external intake link
- confirm the JSON payload now returns `https://sgtmanage.com/availability/...`

## Files

- `app/api/tickets/intake/[token]/route.ts`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`
- `docs/tasks/TASK-20260409-intake-parent-link-origin-hotfix.md`
