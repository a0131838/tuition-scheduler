# TASK-20260414-approval-inbox-client-navigation

## Why

The first approval inbox shipped with normal `<a>` links for filter chips and action links. Inside the shared admin workspace, those links trigger a hard page navigation, which makes the left sidebar visibly refresh even though the user is only changing approval filters.

## Scope

- replace approval-inbox filter-chip anchors with Next.js client navigation
- replace the `Open now` action link in approval cards with Next.js client navigation
- preserve the current filter behavior and URLs

## Out of Scope

- changing approval counts
- changing inbox sorting or data sources
- changing sidebar contents or role rules

## Acceptance

- changing filters on `/admin/approvals` should keep the shared admin layout stable
- the left sidebar should no longer visibly hard-refresh when switching approval-inbox filters
- `Open now` links should continue to route to the existing handling pages
