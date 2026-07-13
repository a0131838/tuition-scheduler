# TASK-20260713-admin-workspace-context-navigation

## Context

After entering Full Care and using the sidebar to open Student Sources, the page body and active sidebar item changed correctly but the shared top header still showed `Full Care / 全托管`. The title was calculated from request headers inside the persistent Next.js admin layout, while sidebar navigation used client-side `Link` transitions that do not remount that layout.

## Change

- Preserve the existing route-to-title and route-to-hint rules in a pure helper module.
- Render the shared header and sidebar context text through a small client component using `usePathname`.
- Keep the server-provided pathname as a first-render fallback.
- Add regression coverage proving Full Care is restricted to `/admin/care` and the shared layout no longer renders route-sensitive text directly from its initial server pathname.

## Non-goals

- Do not change sidebar destinations, page headings, roles, permissions, database records, or business workflows.
- Do not change scheduling, attendance, packages, partner settlement, payroll, invoices, receipts, or financial settings.

## Verification

- `npx tsc --noEmit`
- `npm run test:backend` passes 49/49.
- `npm run build` passes with 192 pages.
- Production-mode Playwright verifies `Full Care -> Student Sources -> Full Care` without a hard refresh; Student Sources shows `Admin Workspace / 管理工作台` and no Full Care text in the shared top header.
- The temporary QA admin session is deleted after the run.

## Risk

Low and display-only. The route-aware component returns text only and receives the existing language and role context as props. No write path or authorization rule changes.
