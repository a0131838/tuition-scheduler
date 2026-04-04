# TASK-20260404-admin-sidebar-regroup-and-visual-pass

## Goal

Improve the admin sidebar information architecture and visual hierarchy so operators can tell each functional block apart faster.

## Scope

- Move `SOP One Pager / SOP一页纸` into `Core Workflows / 核心流程`
- Move `Undeducted Completed / 已完成未减扣` into `Reports / 报表`
- Strengthen admin sidebar group styling, group-title emphasis, and active-group visibility

## Non-Goals

- No route changes
- No permission changes
- No reporting or finance logic changes
- No student, package, schedule, or approval workflow changes

## Risk Check

- Low risk: this is a sidebar grouping and visual hierarchy pass only
- Main verification: confirm regrouped links render in the intended sections and active-group emphasis still works

## Verification

- `npm run build`
- post-deploy `bash ops/server/scripts/new_chat_startup_check.sh`
- manual admin sidebar check on production

## Status

`LIVE`
