# TASK-20260403-remembered-filter-blank-param-audit

## 1) Request

- Request ID: `2026-04-03-remembered-filter-blank-param-audit`
- Requested by: user after packages filter reset bug was fixed and asked to scan other remembered-filter pages
- Date: `2026-04-03`
- Original requirement: inspect the other remembered workbench pages and fix the same class of issue where clearing a filter or returning to the default desk still revives the old remembered state.

## 2) Scope Control

- In scope:
  - `app/admin/students/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/todos/page.tsx`
  - release docs for this ship
- Out of scope:
  - remembered filters on untouched pages
  - package / receipt / expense / settlement / todo business rules
  - data writes, queue calculations, approval behavior
- Must keep unchanged:
  - student query semantics
  - receipt approval queues
  - expense approval / payout logic
  - settlement amount generation
  - todo calculation logic

## 3) Findings

- The same bug pattern existed on several high-frequency workbench pages:
  - some pages treated explicit blank params the same as “param absent”
  - some reset links went to the bare page URL, which caused the first server render to immediately resume remembered state
- Most affected pages:
  - `students`
  - `expense-claims`
  - `receipts-approvals`
  - `partner-settlement`
  - `todos`
  - `feedbacks` student-scope clear path

## 4) Plan

1. Distinguish “param present but blank” from “param absent” wherever the workbench can resume remembered state.
2. Add explicit clear flags for reset links that should bypass remembered state on the first server render.
3. Keep the remembered-workbench feature itself unchanged when the user truly returns without explicit params.

## 5) Changes Made

- Files changed:
  - `app/admin/students/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-remembered-filter-blank-param-audit.md`
- Logic changed:
  - remembered workbench resume now checks param presence instead of only truthy values where that distinction matters
  - reset links now use explicit clear markers like `clearDesk=1`, `clearQueue=1`, `clearFilters=1`, or `clearView=1`
  - feedback student-scope clear now uses an explicit clear path instead of falling back to remembered student scope
- Logic explicitly not changed:
  - no queue math
  - no approval or payout logic
  - no settlement calculation
  - no student/package data writes

## 6) Verification

- Build:
  - `npm run build`
- Runtime:
  - production read-only QA on the affected pages
- Key manual checks:
  - default reset links no longer resume remembered state immediately
  - explicit blank submissions no longer restore old remembered values
  - remembered state still resumes when the operator truly reopens the page without explicit params

## 7) Risks / Follow-up

- Known risks:
  - this fix is intentionally scoped to the pages that still had the blank-vs-absent bug pattern
- Follow-up tasks:
  - if future feedback reports similar behavior elsewhere, audit that page for the same server-side remembered-state pattern before changing query semantics

## 8) Release Record

- Release ID: `2026-04-03-r19`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r19`
