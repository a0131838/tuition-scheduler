# TASK-20260403-packages-filter-clear-fix

## 1) Request

- Request ID: `2026-04-03-packages-filter-clear-fix`
- Requested by: user after教务反馈 packages 页筛选异常
- Date: `2026-04-03`
- Original requirement: packages 页面里搜索/付款筛选有问题，选了 `Unpaid` 后无法回到 `All`，点击 `Clear` 也没有真正清掉。

## 2) Scope Control

- In scope:
  - `app/admin/packages/page.tsx`
  - release docs for this ship
- Out of scope:
  - package query business rules
  - remembered filters on other pages
  - package create / edit / top-up / billing / ledger logic
- Must keep unchanged:
  - package list data source
  - package risk calculation
  - package flow return cards
  - remembered filters feature itself

## 3) Findings

- Root cause: the packages page treated an explicitly submitted empty filter value the same as “no param provided”, then fell back to the remembered filter cookie. As a result:
  - selecting `All Payment Status` after `Unpaid` still restored `unpaid`
  - the plain `/admin/packages` clear link immediately resumed remembered filters on first render
- Affected modules:
  - `app/admin/packages/page.tsx`
- Impact level: Low.

## 4) Plan

1. Distinguish between “param not present” and “param present but intentionally blank”.
2. Respect explicit blank submissions for `q`, `courseId`, `paid`, and `warn`.
3. Add a `clearFilters=1` escape hatch on the clear link so the server does not resume remembered filters on the reset request.

## 5) Changes Made

- Files changed:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-packages-filter-clear-fix.md`
- Logic changed:
  - explicit blank filter submissions now clear remembered `q / courseId / paid / warn` values instead of falling back to cookie state
  - `Clear` now goes through `?clearFilters=1` so the first server render bypasses remembered filters
- Logic explicitly not changed:
  - no package query semantics
  - no package data writes
  - no billing or ledger behavior
  - no remembered-filter behavior on other pages

## 6) Verification

- Build:
  - `npm run build`
- Runtime:
  - post-deploy startup check
  - production read-only QA on `/admin/packages`
- Key manual checks:
  - choose `Unpaid`, then switch back to `All Payment Status` and apply
  - click `Clear` and confirm the desk returns to the default state
  - search can be emptied without old remembered values taking over again

## 7) Risks / Follow-up

- Known risks:
  - this is isolated to one page, but it highlights a pattern to watch for on other remembered-filter workbenches
- Follow-up tasks:
  - if similar complaints appear, audit `feedbacks / finance / students` for the same “blank vs absent param” bug pattern

## 8) Release Record

- Release ID: `2026-04-03-r18`
- Deploy time: pending deploy
- Rollback command/point: previous production commit before `2026-04-03-r18`
