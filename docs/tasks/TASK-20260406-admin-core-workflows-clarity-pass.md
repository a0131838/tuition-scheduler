# TASK-20260406-admin-core-workflows-clarity-pass

## Goal

Make `Core Workflows / 核心流程` easier to understand at a glance by turning it into a more obvious main-operations block instead of a flat list of links.

## Scope

- Strengthen the `Core Workflows` group summary
- Add task-oriented descriptions to key workflow entries
- Increase visual emphasis for the highest-frequency workflow items
- Adjust the group styling so the section stands apart from neighboring sidebar groups

## Non-Goals

- No route changes
- No permission changes
- No queue or workflow logic changes
- No student, schedule, package, ticket, or finance behavior changes

## Risk Check

- Low risk: this is a sidebar copy and emphasis pass only
- Main verification: make sure the first few core workflow items read clearly and still navigate as before

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- manual admin sidebar check on production

## Status

`LIVE`
