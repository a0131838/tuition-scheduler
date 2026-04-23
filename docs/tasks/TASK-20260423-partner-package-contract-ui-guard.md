# TASK-20260423 Partner Package Contract UI Guard

## Goal

Stop partner-settlement packages from showing contradictory student-contract entry points in package billing and student detail.

## Scope

- Detect partner-settlement packages at the page layer.
- Hide the student-contract jump link and draft-creation prompts for partner packages.
- Replace those entry points with a clear explanatory note that partner packages stay outside the student contract workflow.

## Non-goals

- No change to package data, settlement mode, contract statuses, contract tokens, or contract storage.
- No change to direct-billing contract flow behavior.

## Key Files

- `app/admin/packages/[id]/billing/page.tsx`
- `app/admin/students/[id]/page.tsx`
- `docs/tasks/TASK-20260423-partner-package-contract-ui-guard.md`
- `docs/CHANGELOG-LIVE.md`
- `docs/RELEASE-BOARD.md`

## Risks

- Low. This is a page-layer consistency fix only.
- The main risk is hiding a direct-billing contract entry by mistake, so build verification must confirm the package-settlement branch compiles correctly.

## Verification

- `npm run build`
- Verify a partner-settlement package no longer shows:
  - `Create contract draft`
  - `Create from package billing`
- Verify the page now explains that partner-settlement packages do not use the student contract workflow.
