# TASK-20260402 Teacher Sidebar Collapse Follow-up

## Goal

Reduce bilingual-mode visual density in the teacher portal by collapsing lower-priority navigation and long guide copy.

## Scope

- `app/teacher/layout.tsx`
- `app/teacher/TeacherSidebarNavClient.tsx`
- `app/teacher/_components/TeacherWorkspaceHero.tsx`
- release documentation updates for the same ship

## Changes

1. Teacher sidebar
- replace always-expanded navigation groups with collapsible sections
- auto-open the group that matches the current route
- keep non-active groups collapsed by default so the sidebar is lighter on smaller screens

2. Teacher page guides
- move long hero subtitles behind a `Quick guide / 快速说明` disclosure
- keep titles and primary actions visible without requiring teachers to scan long bilingual paragraphs first

## Non-goals

- no teacher routing changes
- no teacher permission changes
- no teacher business-logic changes

## Validation

- `npm run build`
- manually verify:
  - collapsed teacher sidebar groups
  - active teacher group auto-expands
  - teacher subpages show the quick-guide disclosure instead of a full always-open paragraph

## Release notes

- Release ID: `2026-04-02-r02`
- Risk: low
- Rollback: revert this release if teachers report that key navigation items became harder to find
