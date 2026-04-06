# TASK-20260406-admin-sidebar-color-tuning-pass

## Goal

Make the admin sidebar groups easier to tell apart by color alone, while keeping the navigation simple and low-density.

## Scope

- Tune group colors in the admin sidebar
- Keep the simplified label-first layout from the previous follow-up
- Do not add more copy or extra hierarchy blocks

## Non-Goals

- No route changes
- No permission changes
- No queue or workflow logic changes
- No student, schedule, package, ticket, or finance behavior changes

## Risk Check

- Low risk: this is a color-only sidebar pass
- Main verification: confirm the groups are easier to distinguish without adding more text density

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- manual admin sidebar check on production

## Status

`LIVE`
