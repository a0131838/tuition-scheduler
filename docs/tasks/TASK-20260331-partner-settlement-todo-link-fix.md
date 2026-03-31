# TASK-20260331 Partner Settlement Todo Link Fix

## Goal

Fix the broken `Open todo center / 打开待办中心` shortcut in the partner settlement integrity workbench.

## Scope

- `app/admin/reports/partner-settlement/page.tsx`
- release docs only

## Changes

1. Replace the incorrect `/admin/todo-center` href.
2. Point the integrity-workbench shortcut to `/admin/todos`, which is the real admin todo route.

## Non-goals

- No change to settlement calculations.
- No change to warning grouping.
- No change to billing or repair flows.

## Validation

- `npm run build`

## Status

- Completed locally and deployed.
