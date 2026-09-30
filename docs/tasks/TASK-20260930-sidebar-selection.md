# Sidebar selection clarity / 左侧菜单选中识别

## 2026-09-30-r473

- Release ID: `2026-09-30-r473`
- Date/Time (Asia/Singapore): `2026-09-30`
- Deployment status: `READY`; final live proof recorded in sidebar acceptance report.
- Request: make the selected left-menu item and its parent group unmistakable without changing workflows or permissions.
- Change: selected links use dark green/white text, a left marker and checkmark; active groups use a separate pale background and border, indented child links show hierarchy. Hover, keyboard focus and gold favourite stars have distinct appearances. Navigation opens the active group, including dashboard links. Match query-specific CS/Sales workspaces as well as nested paths, preventing a shared /admin path from highlighting the wrong workspace. Existing labels/three-language modes, links and permission-filtered menus remain.
- Validation:33 navigation tests preserve all role/language link sets and cover specific-path/query matching and hidden destinations. Final262-page production build passed.15 isolated authenticated requests cover EN/ZH/BILINGUAL default dashboard, CS/Sales workspaces, student detail and secondary receipt history. Desktop browser click follows selection; history expands its secondary group;375px menu has0 overflowing links/buttons. Computed selected colours are rgb(32,92,67)/white with3px marker; keyboard focus outline and empty console verified. No production records used for acceptance writes.
- Compatibility: presentation and current-link selection only; no database migration, business transition, financial/attendance action or permission change. Favourite storage and all original URLs retained.
- Rollback reference: `3ad08ca6e94b1ceebec49ba6b60369614510473b` (r472); no schema rollback.
- Task: `docs/tasks/TASK-20260930-sidebar-selection.md`.

---

