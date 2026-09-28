# TASK-20260928-workspace-navigation

## Context / 背景

The owner approved the reviewed workspace prototype and a phased implementation in the existing system, explicitly retaining Full Care, School Applications and Next-month Scheduling. All changed interfaces must support Chinese and English; retain the existing bilingual option.

## Change / 变更

- Present existing role-filtered links in seven business groups. Preserve every permitted URL, description and label; never add access through regrouping.
- Keep Full Care, School Applications and Next-month Scheduling in primary navigation. Lower-frequency tools remain expandable, searchable and eligible for favorites.
- Use the most specific route for active highlighting; retain existing favorite storage and four-entry limit.
- Compress duplicate header/sidebar instructions. Keep the reconciliation count visible with details expandable; label the undeducted report accurately.
- Collapse finance exports and operational guidance while keeping approvals visible. All existing financial queries and actions remain unchanged.
- The existing language switch now localises Apply, Saving, the language label and its error message; its API and persistence are unchanged.
- New interface copy uses ZH / EN / BILINGUAL. Local Chinese and English prototype editions cover all seven demo modules with the same functionality and sample data.

## Non-goals / 边界

No business data correction, page deletion, schema change, role expansion, payment, package deduction, payroll, attendance, contract or scheduling logic change. This is the first presentation batch, not the full audited workflow remediation or a claim that every historical page has been retranslated. Prototype data is not connected to production.

## Verification / 验证

- `npm run build`: passed, 259 static pages generated.
- `npx tsx --test tests/admin-navigation-regrouping.test.ts tests/navigation-information-architecture.test.ts tests/admin-workspace-context.test.ts tests/full-care-launch-ui.test.ts`: 47 passed. Real menu declarations evaluated without auth/database in 30 role/language/extended-access cases; permitted URL sets and translated content match before/after regrouping.
- `tests/admin-navigation-performance.test.ts`: five pass, one pre-existing ticket-page source assertion (`const sessionsPromise =`) fails, independently reproduced at base 5e305289. No unrelated source/test edits made to silence it.
- Browser verification rendered the actual sidebar component with fixture links and a mocked pathname, without an auth bypass or database. Checked three language modes, favorite persistence across language changes, collapsible secondary links, search discovery and empty search results. No console errors.
- English prototype: seven navigation destinations, 27 tabs, primary-action detail drawers and return navigation passed; no console errors. Chinese/English switch verified.
- Authenticated finance page was not visually exercised with local DB; build and source review cover this presentation-only change.
- Guarded deployment must verify local/GitHub/server commit identity, PM2 PID and HTTP 200.

## Risk / 风险

Low scope: presentation and navigation grouping only. Staff may need to use search to locate moved links. No claim of complete business-workflow remediation; original audit findings remain separate follow-up work.

## Rollback

Previous production commit: `5e305289277475e1b0c72a811ee97abf05fd6035`. No data rollback required by these changes.
