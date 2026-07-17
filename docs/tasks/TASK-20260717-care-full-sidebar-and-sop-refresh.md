# TASK-20260717 Full Care Complete Sidebar and SOP Refresh

## Goal

Restore the complete role-appropriate admin sidebar on Full Care routes, then refresh the detailed Full Care training SOP against the final production UI.

## Delivered

- Admin users use the normal complete admin navigation inside `/admin/care*`.
- Full Care remains highlighted through the existing route-aware active-state logic.
- Care-specific student, quality, project, operations and report tabs remain inside page content.
- Finance and resource-only users continue to receive their existing role-specific navigation groups.
- Detailed SOP screenshots, annotations, HTML and PDF will be regenerated from the live UI.

## Safety Boundary

- No route authorization or workspace permission changes.
- No CARE form, Server Action, API, state-transition or parent-visibility changes.
- No database migration or real-student update.
- No teaching, package, payroll, partner settlement, invoice, receipt or miniapp behavior changes.

## Verification

- `npx tsc --noEmit --pretty false`
- `npm run test:backend`
- `npm run build`
- `git diff --check`
- Authenticated production Admin desktop/mobile navigation check.
- Refreshed SOP page-count, text extraction and rendered contact-sheet review.
- Temporary SOP fixtures and sessions cleaned to zero.

## Production Acceptance

- Guarded release completed with runtime commit `21ece37`; production reports 107 completed migrations with none pending, PM2 online with zero restarts and `/admin/login` HTTP 200.
- Authenticated production screenshots confirm the complete Admin sidebar, active Full Care link and unchanged Care local navigation.
- Refreshed SOP uses 12 real production desktop/mobile screenshots and calibrated red callouts.
- Final PDF is 22 populated A4 landscape pages, approximately 2.5 MB, with 6,024 extracted characters and all required workflow terms present.
- Rendered contact sheet and focused page review show no blank pages, clipped text, misplaced callouts or unreadable screenshots.
- Temporary training student, engagement, parent and session cleanup all report zero residue.
