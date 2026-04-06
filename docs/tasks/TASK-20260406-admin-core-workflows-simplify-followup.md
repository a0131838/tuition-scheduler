# TASK-20260406-admin-core-workflows-simplify-followup

## Goal

Keep `Core Workflows / 核心流程` visually easier to distinguish while restoring a simpler, lighter sidebar reading experience.

## Scope

- Remove the extra item-level descriptions added in the previous pass
- Shorten the `Core Workflows` section summary
- Keep the stronger group color distinction in place

## Non-Goals

- No route changes
- No permission changes
- No queue or workflow logic changes
- No student, schedule, package, ticket, or finance behavior changes

## Risk Check

- Low risk: this is a sidebar copy simplification only
- Main verification: make sure the sidebar remains simpler while the core-workflows group is still visually distinct

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- manual admin sidebar check on production

## Status

`LIVE`
