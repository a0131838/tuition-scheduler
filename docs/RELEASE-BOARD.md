# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-04-07`
- Health check: `/admin/login` => `200`
- Version alignment: `ALIGNED`
- Exact server/local/origin commit hashes: use `bash ops/server/scripts/new_chat_startup_check.sh`

## Current Known State

- Local HEAD: current production branch head for `feat/strict-superadmin-availability-bypass`.
- Previous server fix remains in place: upload static paths under `/uploads/*` are reachable.
- `bash ops/server/scripts/new_chat_startup_check.sh` confirmed local/origin/server are aligned and `/admin/login` => `200`.
- Current release line on this branch: `2026-04-07-r04` (final-report PDF renewal guidance pass).
- `2026-03-26-r1`, `2026-03-26-r2`, and `2026-03-26-r3` are now live on the current server commit lineage.
- Release-doc gate requires `CHANGELOG-LIVE`, `RELEASE-BOARD`, and a matching `TASK-*` file in the same deploy commit.

## Open Risks

- Working tree hygiene risk: local repo currently contains unrelated untracked files and generated artifacts; avoid mixing them into deploy commits.
- Human memory risk: changes were spread across multiple sessions.
- Finance menu perception risk: role-based sidebar can look like "missing features" for FINANCE users.
- New process risk: deploy will fail if release docs are not included in the deploy commit.
- Historical risk confirmed: server env previously pointed to localhost DB in older backups.

## Process Guard (Installed)

1. `deploy_app.sh` now calls `verify_release_docs.sh` by default.
2. GitHub Actions deploy workflow now runs the same gate before SSH deploy.
3. Emergency bypass exists: `SKIP_RELEASE_DOC_CHECK=true` (use only for urgent hotfix).

## Server Handoff Guard (Installed)

1. Added fixed server profile doc: `docs/SERVER-HANDOFF.md`
2. Added local config template: `ops/server/server-handoff.env.example`
3. Added one-command scripts:
   - `bash ops/server/scripts/quick_check.sh`
   - `bash ops/server/scripts/quick_deploy.sh`

## Next Mandatory Step (No Business Logic Change)

1. Keep `CHANGELOG-LIVE`, `RELEASE-BOARD`, `TASK-*` updated for each deploy commit.
2. Add post-deploy quick check for a known `/uploads/payment-proofs/*` URL.
3. Keep ops docs aligned with Neon-as-production-db policy.

## 2026-04-06-r12 Deployed

- Scope: tune the admin sidebar colors only, keeping the layout simple while separating groups more clearly by color.
- Business impact:
  - `Today` stays blue, `Core Workflows` now reads as a distinct green-teal block, `Finance & Review` stays warm, `Setup & Control` stays purple, and `Reports` stays neutral
  - the sidebar remains a short label-first list; no extra copy was added back
  - no routes, permissions, queue logic, finance logic, or student/teaching workflows changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - operator QA should confirm the groups are easier to distinguish by color while the sidebar stays simple

## 2026-04-06-r11 Deployed

- Scope: simplify the `Core Workflows / 核心流程` sidebar refinement so the section stays easy to scan without extra text density.
- Business impact:
  - `Core Workflows` keeps the stronger group color treatment from the previous pass
  - the section summary is shorter and item-level explanatory copy is removed again, so the sidebar is closer to the original simple style
  - no routes, permissions, queue logic, finance logic, or scheduling/student/package workflows changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - operator QA should confirm the sidebar feels simpler while the core-workflows group is still easier to distinguish by color

## 2026-04-06-r10 Deployed

- Scope: strengthen `Core Workflows / 核心流程` so the admin sidebar reads more clearly as the main operations zone.
- Business impact:
  - `Students / Enrollments / Packages / Ticket Center` now carry task-oriented descriptions and stronger visual weight
  - the `Core Workflows` group summary now explicitly frames the section as the main student/teaching workflow area
  - the core-workflows group styling is more distinct, making it easier to separate from `Today`, `Finance & Review`, and `Reports`
  - no routes, permissions, queue logic, finance logic, or scheduling/student/package workflows changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - operator QA should confirm `Core Workflows` now reads more clearly and the first four items stand out as the main workflow entrances

## 2026-04-04-r09 Deployed

- Scope: regroup key admin sidebar links and strengthen sidebar group hierarchy so operators can tell sections apart faster.
- Business impact:
  - `SOP One Pager / SOP一页纸` now lives under `Core Workflows / 核心流程`
  - `Undeducted Completed / 已完成未减扣` now lives under `Reports / 报表`
  - admin sidebar groups now use stronger per-section accent styling, clearer uppercase titles, and a more obvious active-group indicator
  - active links now show a stronger left accent bar so operators can see both the current item and the current section at a glance
  - no permissions, routes, finance logic, reporting logic, or schedule/student/package workflows changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - operator QA should confirm the sidebar now shows the regrouped links in the expected sections and the visual grouping is easier to scan

## 2026-04-04-r08 Deployed

- Scope: move `Monthly Schedule / 月课表总览` from the admin `Reports` group into `Today / 今天`.
- Business impact:
  - admin operators now see the month schedule inside the day-first task cluster instead of the lower-priority reports cluster
  - `Reports / 报表` keeps its audit/archive/reporting links while `Today / 今天` now includes both live schedule and month schedule navigation
  - no schedule data, reporting logic, permissions, finance flows, or teacher workflows changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - operator QA should confirm the sidebar now shows `Monthly Schedule / 月课表总览` under `Today / 今天`

## 2026-04-03-r25 Deployed

- Scope: add a `Final Report Exempt / 结课报告无需跟进` path so operations can mark no-report packages out of the final-report queue without assigning teachers first.
- Business impact:
  - admin `Final Report Center` now supports `Mark exempt / 标记无需报告` from both completed-package candidates and existing report records
  - exempted final reports now record who exempted them, when, and why
  - teacher `Final Reports` hides `EXEMPT` items so no-report packages stop appearing as pending teacher work
  - the candidate loader now drops teacher options already exempted for that package, so those packages do not keep resurfacing in the assign queue
  - no midterm-report behavior, package completion math, attendance, finance, share-link, or PDF delivery logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA must confirm `/admin/reports/final` shows `Exempt`, candidate rows expose `Mark exempt`, and exempted tasks disappear from `/teacher/final-reports`

## 2026-04-03-r26 Deployed

- Scope: add a `Midterm Report Exempt / 中期报告无需跟进` path so operations can mark no-report midpoint tasks out of the midterm-report queue without assigning teachers first.
- Business impact:
  - admin `Midterm Report Center` now supports `Mark exempt / 标记无需报告` from both midpoint candidate rows and existing report records
  - exempted midterm reports now record who exempted them, when, and why
  - teacher `Midterm Reports` hides `EXEMPT` items so no-report midpoint tasks stop appearing as teacher work
  - the candidate loader now drops teacher/package pairs already exempted, so those tasks do not keep resurfacing in the assign queue
  - no final-report behavior, package progress math, attendance, finance, PDF generation, or existing forwarded-lock behavior changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA must confirm `/admin/reports/midterm` shows `Exempt`, candidate rows expose `Mark exempt`, and teacher `/teacher/midterm-reports` excludes exempt tasks

## 2026-04-03-r27 Deployed

- Scope: add an `Archive / 归档` layer to midterm and final reports so completed or exempt records can leave the active desks while staying recoverable.
- Business impact:
  - admin `Final Report Center` now supports `Archive / Restore` for delivered or exempt reports, and archiving revokes any active parent share link
  - admin `Midterm Report Center` now supports `Archive / Restore` for forwarded/locked or exempt reports
  - both report centers now expose an `Archived` filter so historical items can be reviewed without occupying the main workbench
  - teacher `Final Reports` and `Midterm Reports` hide archived items by default, and archived detail pages can no longer be opened from teacher routes
  - candidate loaders now keep archived teacher/package pairs out of assignment options so already-finished history does not keep resurfacing
  - no report content, delivery workflow, finance logic, attendance, or package progress math changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA must confirm `/admin/reports/final` and `/admin/reports/midterm` show `Archived`, and teacher report lists still load without archived items in their active queues

## 2026-04-04-r01 Deployed

- Scope: keep admin student-detail actions inside the section the operator was already working in instead of returning to the top of the page after refreshes or same-page redirects.
- Business impact:
  - calendar month switches now stay in `Planning tools & calendar`
  - quick-schedule opens and refreshes back into `Quick Schedule`
  - upcoming-session actions such as `Change Teacher`, `Change Course`, `Cancel`, and `Restore` now return to `Upcoming Sessions`
  - attendance filter apply / clear now stays in `Attendance`
  - student profile saves now return to `Edit Student`
  - no student data rules, scheduling logic, attendance logic, deduction logic, package logic, or billing behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 14d5980` and `https://sgtmanage.com/admin/login` returned `200`
  - post-deploy `curl -I https://sgtmanage.com/admin/login` returned `200`
  - targeted student-detail verification covered calendar links, quick-schedule links, attendance filter routing, and refresh-driven section return helpers

## 2026-04-04-r06 Deployed

- Scope: remove the remaining student-detail `edit-student` id collision so explicit edit returns target the real edit details block.
- Business impact:
  - the outer student-detail edit wrapper no longer shadows `#edit-student`
  - `focus=edit-student#edit-student` can now target the actual edit `<details>` block instead of a wrapper div
  - no student save/delete behavior, scheduling rules, attendance rules, package logic, billing logic, or reporting logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 5967863` and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA confirmed `focus=edit-student#edit-student` now lands on a single `DETAILS` target and leaves the edit block open

## 2026-04-04-r07 Deployed

- Scope: fix package-workbench reset shortcuts so "Back to default workbench" clears remembered filters instead of reloading the same remembered package state.
- Business impact:
  - the resumed-filters banner now routes `Back to default workbench` through the explicit `clearFilters=1` path
  - the empty-state shortcut uses the same clear path, so operators can really escape remembered package filters
  - package filtering rules, billing, ledger, top-up, edit, and delete logic remain unchanged
- Validation:
  - `npm run build`
  - production read-only QA reproduced the bug before the fix: `/admin/packages` resumed remembered `paid=unpaid`, and the "Back to default workbench" shortcut still pointed to bare `/admin/packages`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = a4568df` and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA confirmed the shortcut now routes to `/admin/packages?clearFilters=1`, clears remembered package filters, hides the resumed-filters banner, and resets payment state back to `All / 全部`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-04-r05 Deployed

- Scope: hotfix the remaining student-detail explicit-focus gap so `Edit Student / 编辑学生` stays open when operators return to that section.
- Business impact:
  - `focus=edit-student#edit-student` now forces the edit-student details block open even in the client-side path that QA found still closed
  - the broader student-detail focus-open behavior from `r04` remains unchanged for packages, enrollments, quick schedule, attendance, and calendar tools
  - no student save/delete behavior, scheduling rules, attendance rules, package logic, billing logic, or reporting logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 9c86c41`
  - `https://sgtmanage.com/admin/login` returned `200`
  - follow-up QA found a remaining DOM id collision on `edit-student`, so `r05` should be treated as a partial hotfix only

## 2026-04-04-r04 Deployed

- Scope: keep student-detail first-render focus aligned with the operator's current section when the URL already carries explicit section intent.
- Business impact:
  - `focus=packages`, `focus=enrollments`, `focus=quick-schedule`, and `focus=edit-student` now open those student-detail sections on the initial server render
  - `focus=calendar-tools` now also keeps the planning calendar expanded on the initial server render
  - attendance clear/reset continues to keep the operator inside attendance
  - no scheduling, attendance, deduction, package, billing, or student data rules changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 64040e5`
  - `https://sgtmanage.com/admin/login` returned `200`
  - operator click-through should confirm explicit focus returns open the intended student-detail section on first render

## 2026-04-04-r03 Deployed

- Scope: keep student-detail workbench sections open when operators return by hash after refreshes or same-page redirects.
- Business impact:
  - hash-driven returns now reopen the matching student-detail `<details>` block instead of leaving the operator on a closed section
  - packages, attendance, and edit-student flows can return to the intended work area without rescanning the page
  - attendance `Clear` now explicitly keeps the operator in the attendance section
  - no scheduling, attendance, deduction, package, billing, or student data rules changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = b3ce26b`
  - `https://sgtmanage.com/admin/login` returned `200`
  - the shared student-detail hash restore layer now reopens matching `<details>` blocks for hash-driven returns; targeted operator click-through should confirm closed student-detail sections reopen after refresh returns

## 2026-04-04-r02 Deployed

- Scope: keep `Planning tools & calendar / 排课工具与日历` expanded when admins click `Prev Month / Next Month` inside student detail.
- Business impact:
  - student-detail month navigation now preserves both the `#calendar-tools` hash and the expanded `<details>` state
  - admins can keep moving month-by-month in the calendar without reopening the planning section every time
  - no quick scheduling, attendance, deduction, package, or billing behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 29b623a`
  - `https://sgtmanage.com/admin/login` returned `200`
  - the release adds `calendarOpen=1` to month navigation so the calendar details stay expanded on server render; browser click-through should be confirmed in the next operator pass

## 2026-04-03-r18 Deployed

- Scope: fix packages workbench filter-reset behavior so explicitly clearing filters no longer gets overwritten by remembered filters.
- Business impact:
  - admins can now switch payment status back from `Unpaid` to `All Payment Status` without the remembered filter restoring `unpaid`
  - the `Clear` action now truly resets the packages desk instead of immediately resuming the old filter set on first server render
  - search, course, payment, and alert filters can all be explicitly cleared while keeping remembered filters available for normal revisit flows
  - no package list rules, package edits, top-up logic, billing behavior, or ledger behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA must confirm explicit blank filter submissions and `clearFilters=1` both bypass remembered filter resume

## 2026-04-03-r17 Deployed

- Scope: move the student package month-end balance report off the invoice workbench into its own finance page.
- Business impact:
  - finance now opens the month-end balance report from a dedicated route: `/admin/finance/student-package-balances`
  - the invoice workbench no longer mixes invoice issuance with balance-report preview content
  - finance sidebar and finance home now link to the standalone report page
  - no report math, CSV output, amount-basis logic, invoice behavior, receipt behavior, or approval behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - production read-only QA must confirm the new report route renders and the invoice workbench now shows only the navigation card

## 2026-04-03-r16 Deployed

- Scope: add color-coded amount-basis badges and a small basis legend to the student billing month-end balance report.
- Business impact:
  - the month-end report now shows `purchase ledger / receipts / package paid amount / none` as visually distinct badges instead of plain text
  - finance can scan basis quality faster without reading the full explanatory paragraph row by row
  - no report math, export output, package ledger writes, billing behavior, or approval behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
- Release doc sync:
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-badges.md`

## 2026-04-03-r15 Deployed

- Scope: upgrade the student billing month-end balance report to prefer purchase-ledger amount history when available.
- Business impact:
  - `PackageTxn` now stores optional `deltaAmount` for purchase/top-up history
  - new package creation and package top-up writes now persist purchase amount basis on the corresponding `PURCHASE` ledger row when available
  - single-purchase `HOURS` packages can align that purchase-row amount when package paid amount is edited later
  - student billing month-end report and CSV now prefer purchase-ledger amount basis when purchase history is complete, and safely fall back to receipt totals or package paid amount for older packages
  - no deduction logic, package remaining-minute behavior, receipt approval behavior, invoice approval behavior, or partner settlement rules changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-03-r14 Deployed

- Scope: add an inline preview layer to the student billing month-end balance report.
- Business impact:
  - the month-end balance block inside `Student Package Invoice Workbench` now shows package count, total remaining hours, estimated remaining amount, and the first 12 rows inline
  - finance can inspect the month-end report on page before exporting the full CSV
  - the CSV route and report basis stay unchanged
  - no invoice preview / issue logic, package deduction logic, receipt logic, or approval logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-03-r13 Deployed

- Scope: add a read-only month-end balance export under student billing.
- Business impact:
  - `Student Package Invoice Workbench` now includes a `Month-end balance report / 月末余额报表` block with month picker and CSV export
  - finance can export `HOURS` package remaining balance as of a selected month end without touching package deduction, invoice, receipt, or approval flows
  - the export reports remaining hours from `PackageTxn` history and an estimated remaining amount using receipt totals up to month end when available, otherwise falling back to package `paidAmount`
  - no package write logic, billing logic, receipt approval logic, or finance workbench behavior changed
- Validation:
  - `npm run build`
  - local logged-in QA on `http://127.0.0.1:3322/admin/finance/student-package-invoices?balanceMonth=2026-03` confirmed the new report block appears
  - local export QA on `http://127.0.0.1:3322/api/exports/student-package-month-end-balance?month=2026-03` returned `200` and a populated CSV
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-03-r11 Deployed

- Scope: continue the teacher-side UI clarity pass on the teacher card, midterm reports, and payroll desk.
- Business impact:
  - teacher card now uses clearer linked-profile/not-found guidance and explicitly nudges teachers to finish their self intro before sharing or exporting the card
  - midterm reports now explains empty/not-linked/not-found states more clearly, and the list/detail pages now separate primary fill/submit actions from secondary view/save actions
  - teacher payroll now uses the same workbench-style guidance for not-linked and invalid-month states, and its desk filter row now includes a clear secondary `Clear` action
  - no intro save logic, card export logic, report save/submit behavior, report locking rules, payroll math, payroll confirmation behavior, or payout workflow changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the new teacher-card guidance, midterm empty-state/action hierarchy, and payroll clear/error-state improvements on `/teacher/card`, `/teacher/midterm-reports`, and `/teacher/payroll`

## 2026-04-03-r10 Deployed

- Scope: continue the teacher-side UI clarity pass on expense claims and sign-in alerts.
- Business impact:
  - teacher expense claims now makes `Apply / Clear filters` read more clearly as primary vs. secondary actions, and the history area now explains what to do when the current filter set returns no claims or when no claims exist yet
  - teacher sign-in alerts now uses fuller “not linked yet” and “no alerts” guidance cards, and the main “open session / fill feedback” entry is visually clearer as the primary next action
  - no expense submit/resubmit/withdraw rules, attachment logic, alert sync behavior, quick-mark behavior, attendance handling, or feedback-overdue detection changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the same new guidance and action hierarchy on `/teacher/expense-claims`, `/teacher/expense-claims?status=PAID&month=1999-01`, `/teacher/alerts`, and `/teacher/alerts?showResolved=1`

## 2026-04-03-r09 Deployed

- Scope: run the next teacher-side clarity pass on the student feedback desk and ticket board.
- Business impact:
  - student feedbacks now explains why the desk is empty when no linked students or no matching feedbacks exist, and it points teachers back to sessions or the full desk instead of stopping at a flat gray message
  - student feedback timeline drawers now explain why a selected student has no visible items in the current filtered view and offer a direct way back to the full timeline or list
  - teacher tickets now uses clearer “not linked yet” and empty-board states, plus stronger apply/clear and completion-action emphasis
  - no feedback read-marking behavior, handoff-risk logic, ticket proof-file handling, completion-note requirements, or ticket status transitions changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-03-r08 Deployed

- Scope: continue button hierarchy and empty-state guidance cleanup on admin feedbacks, packages, and partner settlement.
- Business impact:
  - feedbacks now explains whether operators should go back to overdue work, pending-forward work, or final history when the current queue is empty, and its filter actions now read more clearly as main vs. secondary actions
  - packages now explains whether the filtered list is empty because of active filters or because no package exists yet, and points operators back to the right desk instead of leaving a dead-end blank state
  - partner settlement now uses a stronger primary/danger action split and replaces several flat “no items” states with guidance that tells operators whether to open live queues, billing records, or history next
  - no feedback behavior, package CRUD/top-up logic, settlement calculations, settlement creation rules, or revert semantics changed
- Validation:
  - `npm run build`
  - logged-in local QA on `http://127.0.0.1:3336` confirmed the new empty-state cards and button hierarchy on `/admin/feedbacks`, `/admin/packages`, and `/admin/reports/partner-settlement`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the same guidance and button hierarchy on the same three production pages

## 2026-04-03-r07 Deployed

- Scope: improve button hierarchy and empty-state guidance on teacher payroll, expense claims, and receipt approvals.
- Business impact:
  - teacher payroll now uses a clearer no-data card that explicitly says no confirmation is needed yet and links directly back to dashboard or expense claims
  - expense claims now distinguishes approve/pay actions from reject actions more clearly and explains what to do when review or payout queues are empty
  - receipt approvals now distinguishes approve vs. reject vs. revoke actions more clearly and explains what to do when queue filters return nothing or no receipt is selected
  - no payroll math, payroll confirmation rules, expense approval logic, receipt approval order, payout behavior, or attachment rules changed
- Validation:
  - `npm run build`
  - logged-in local QA on `http://127.0.0.1:3335` confirmed the new empty-state cards and button hierarchy on `/teacher/payroll`, `/admin/expense-claims`, and `/admin/receipts-approvals`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the same guidance and button hierarchy on the same three production pages

## 2026-04-03-r06 Deployed

- Scope: run the fourth admin copy-clarity pass on the teacher payroll desk, the student package invoice workbench, and the attachment health desk.
- Business impact:
  - the admin payroll desk now uses clearer queue-state, cycle-explainer, and payout-group wording, so finance operators can understand the next step faster
  - the student package invoice page now reads more like a guided workbench, with clearer preview, form, and recent-invoice wording
  - the attachment health desk now uses more consistent bilingual workbench copy across hero text, shortcuts, source guides, restore flow, and the missing-file table
  - no payroll calculations, payout permissions, invoice creation rules, attachment recovery logic, or storage routing changed
- Validation:
  - `npm run build`
  - logged-in local QA on `http://127.0.0.1:3334` confirmed the new copy on `/admin/reports/teacher-payroll`, `/admin/finance/student-package-invoices`, and `/admin/recovery/uploads`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the new wording is visible on the same three production pages

## 2026-04-03-r05 Deployed

- Scope: run the third admin copy-clarity pass on the ticket center, finance workbench, and teacher payroll detail page.
- Business impact:
  - the admin ticket center now uses clearer error, intake-link, queue, and action-field wording, so operators can scan ticket actions faster
  - the finance workbench now uses plainer search, exception-filter, and reminder-preview wording, so invoice follow-up states are easier to understand
  - the teacher payroll detail page now uses clearer scope/filter wording and no longer shows an unused combo-summary status header
  - no ticket workflow rules, finance reminder behavior, payroll math, completion rules, or approval logic changed
- Validation:
  - `npm run build`
  - logged-in local QA on `http://127.0.0.1:3333` confirmed the new wording on `/admin/tickets`, `/admin/finance/workbench`, and `/admin/reports/teacher-payroll/[teacherId]`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the new copy is visible on the same three production pages

## 2026-04-03-r04 Deployed

- Scope: run the second bilingual copy-clarity pass on teacher tickets, admin teacher payroll, and partner settlement billing.
- Business impact:
  - teacher ticket filters, proof-file labels, and action-error banners read more naturally
  - admin payroll queue labels, scope notes, and jump shortcuts are clearer for operators
  - partner billing tabs, payment/receipt form labels, and export headings are easier to scan
  - no ticket workflow rules, payroll math or approval behavior, partner billing flows, or storage logic changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3332` confirmed the new wording on teacher tickets, admin payroll, and partner billing
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `313f3ba` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the new copy is visible on the same three production pages

## 2026-04-02-r15 Deployed

- Scope: remember the last working filter set on the admin packages workbench.
- Business impact:
  - packages can now reopen the operator's last remembered filter set when they come back without explicit URL params
  - student-name search, payment-status filter, and alert-only filter can all be resumed without rebuilding the workbench by hand
  - package-flow return pages such as `edited`, `topup`, or `deleted` still keep their own flow-card guidance and do not get overwritten by the remembered-filter banner
  - no package edit rules, top-up math, billing logic, ledger logic, or focus-return behavior changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3318` confirmed `/admin/packages` restores `q=赵&paid=unpaid&warn=alert` when opened without URL params
  - fresh local logged-in QA on `http://127.0.0.1:3318` confirmed the resume banner appears on the plain workbench-open path
  - fresh local logged-in QA on `http://127.0.0.1:3318` confirmed the resume banner is suppressed on `packageFlow=deleted` return pages while the delete flow card still renders
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/packages` restores the remembered filter set and still suppresses the resume banner on package-flow return pages

## 2026-04-02-r14 Deployed

- Scope: remember the last working month/history/panel view on the admin partner-settlement workbench.
- Business impact:
  - partner settlement can now reopen the operator's last remembered month on first open when they come back without explicit URL params
  - the same remembered view can also restore the billing-history filter and reopen either the history or setup disclosure without rebuilding the page state
  - settlement-flow return pages such as `rate-updated` still keep their own flow card guidance and do not get overwritten by the remembered-view banner
  - no settlement math, settlement creation rules, invoice generation, revert semantics, or approval behavior changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3317` confirmed `/admin/reports/partner-settlement` restores `month=2026-03&history=receipt-created&panel=history` when opened without URL params
  - fresh local logged-in QA on `http://127.0.0.1:3317` confirmed `/admin/reports/partner-settlement` also restores `month=2026-03&panel=setup` and opens the setup disclosure
  - fresh local logged-in QA on `http://127.0.0.1:3317` confirmed the resume banner is suppressed on `settlementFlow=rate-updated` return pages
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/reports/partner-settlement` restores the remembered month/history/panel view and still suppresses the resume banner on settlement-flow return pages

## 2026-04-02-r13 Deployed

- Scope: remember the last working queue and student scope on the admin feedback desk.
- Business impact:
  - the feedback desk can now reopen the operator's last remembered queue when they come back without explicit URL params
  - the same remembered state can also restore a student-scope filter, so one student's feedback trail can be resumed without rebuilding it
  - feedback-flow return pages such as `forwarded` still keep their own success guidance and do not get overwritten by the remembered-queue banner
  - no feedback write rules, forward-mark rules, proxy-draft behavior, teacher workflows, or focus-return logic changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3316` confirmed `/admin/feedbacks` restores `status=pending` from cookie when opened without URL params
  - fresh local logged-in QA on `http://127.0.0.1:3316` confirmed `/admin/feedbacks` also restores `status=pending&studentId=b54eae8f-461f-4aae-9a22-8ec7a1033c8a`
  - fresh local logged-in QA on `http://127.0.0.1:3316` confirmed the resume banner is suppressed on `feedbackFlow=forwarded` return pages
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/feedbacks` restores the remembered queue/student scope and still suppresses the resume banner on feedback-flow return pages


## 2026-04-02-r12 Deployed

- Scope: remember the last working queue/filter state on admin receipt approvals and expense claims.
- Business impact:
  - receipt approvals can now reopen the last remembered global queue filter/bucket/month view when operators return without explicit URL params
  - expense claims can now reopen the last remembered finance dataset/filter set when operators return without explicit URL params
  - both pages now show an explicit resume hint and a direct shortcut back to the default desk/queue
  - no approval order, selected item routing, receipt creation rules, expense approval rules, payout logic, or attachment business logic changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed receipts approvals restores `queueFilter=FILE_ISSUE&queueBucket=OPEN` from cookie when opened without URL params
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed expense claims restores `approvedUnpaidOnly=1&currency=SGD` from cookie when opened without URL params
  - both pages show an explicit resume hint plus a direct return-to-default link
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `0ff6b71` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed both finance pages restore the remembered cookie state on production when opened without explicit URL params

## 2026-04-02-r11 Deployed

- Scope: partner settlement workspace context-return follow-up for settlement rate updates, online/offline settlement creation, and settlement revert actions.
- Business impact:
  - updating settlement rates now returns operators to the same settlement month with an explicit flow card and shortcuts back to setup or the live queue
  - creating online or offline settlement records now keeps the new billing record highlighted and exposes direct shortcuts into billing workspace plus the next queue item
  - reverting a settlement record now refreshes the same month view with a direct shortcut to the next pending billing record or back to the online/offline queues
  - no settlement creation rules, rate math, revert semantics, invoice generation rules, or payout behavior changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed the `online-created`, `offline-created`, `settlement-reverted`, and `rate-updated` flow cards render with the expected shortcuts
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed both online and offline queue rows now expose stable `partner-online-*` / `partner-offline-*` anchors and focused-row styling when return params are present
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `294e118` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the same production page renders the `online-created`, `offline-created`, `settlement-reverted`, and `rate-updated` flow cards plus stable `partner-online-*` / `partner-offline-*` row anchors for `month=2026-04`

## 2026-04-02-r10 Deployed

- Scope: packages workbench context-return follow-up for package edit, top-up, and delete actions.
- Business impact:
  - editing a package now returns the operator to the same packages queue with the handled package highlighted and direct shortcuts to billing or ledger
  - saving a top-up now returns the operator to the same package row with an explicit balance-focused shortcut plus direct billing/ledger links
  - deleting a package now refreshes the queue with an explicit shortcut to the next visible package instead of leaving the operator to re-scan the whole list
  - no package CRUD rules, top-up math, billing behavior, ledger behavior, or filter business logic changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3314` confirmed edit/top-up/delete return cards and row anchors render as expected
  - source verification confirmed package rows now carry stable `package-row-*` anchors and focused-row styling when return params are present

## 2026-04-02-r09 Deployed

- Scope: feedback desk context-return follow-up for forwarded and proxy-draft actions.
- Business impact:
  - marking a feedback as forwarded now returns the operator to the forwarded queue with an explicit flow card and a shortcut to the next pending item
  - saving a proxy draft now returns the operator to the proxy queue with an explicit flow card and a shortcut back to the missing queue
  - feedback cards and overdue-session cards can now stay visually focused after a refresh because the page uses URL-based focus anchors instead of scroll-only refresh
  - no feedback content rules, forward-mark rules, proxy-draft persistence, or teacher-side workflows changed
- Validation:
  - `npm run build`
  - local logged-in QA confirmed the forwarded flow card and next-pending shortcut render as expected
  - source verification confirmed anchor and focus rendering for both feedback-card and overdue-session-card flows

## 2026-04-02-r08 Deployed

- Scope: finance next-action shortcut follow-up for receipt approvals and expense claims.
- Business impact:
  - receipt approvals now sends finance directly to the approval block once a repaired receipt is clean again, while still keeping unresolved receipts on the safer fix-tool path
  - expense claims now exposes anchor-based shortcuts to review actions and payment details when the returned claim or payout group is actually ready for the next step
  - unresolved repair-return states still keep the safer `Back to selected claim / group` and attachment-issue shortcuts in place
  - no approval order, payout batching rules, receipt creation rules, or attachment business logic changed
- Validation:
  - `npm run build`
  - local logged-in QA confirmed unresolved receipt repair returns still show `Open fix tools again` and `Stay on this receipt`
  - local logged-in QA confirmed unresolved expense repair returns still show `Back to selected claim` and `Open all attachment issues`
  - source verification confirmed resolved-state anchor shortcuts were added for receipt approval actions, expense review actions, and expense payment details

## 2026-04-02-r07 Deployed

- Scope: finance repair-loop phase 2 follow-up for receipt approvals and expense claims.
- Business impact:
  - receipt approvals now translates proof-repair action results into clearer localized success states and tells finance whether the selected receipt is actually ready for review again
  - expense claims now preserves explicit return context when finance jumps into attachment cleanup or submitter history from a selected review item or payout group
  - expense claims now surfaces a top-level repair-loop card so finance can return directly to the selected claim or payout group instead of reconstructing queue context
  - no approval order, payout batching logic, attachment storage rules, receipt creation rules, or expense-claim business transitions changed
- Validation:
  - `npm run build`
  - fresh local logged-in QA on `http://127.0.0.1:3311` confirmed receipt approvals shows the localized proof-repair success label and the new repair-result state card
  - fresh local logged-in QA on `http://127.0.0.1:3311` confirmed expense claims shows the repair-loop card with direct return links back to the selected claim

## 2026-04-02-r06 Deployed

- Scope: finance repair-loop return-path follow-up plus remembered admin student queues and clearer teacher session status summaries.
- Business impact:
  - admin receipt approvals now keeps finance users anchored to the selected receipt review item while they repair proofs or create receipts inside package workspace
  - admin students can now reopen their remembered queue on first paint instead of briefly landing on the default queue first, with an explicit `Switch to today queue` escape hatch
  - teacher session detail now surfaces attendance status, feedback status, and the next recommended action before the existing step cards
  - no approval order, receipt creation rule, student CRUD logic, attendance save behavior, or feedback submission rule changed
- Validation:
  - `npm run build`
  - local logged-in QA confirmed admin students remembered-queue resume and escape hatch
  - local logged-in QA confirmed admin receipt approvals repair workspace carries return context through repair actions
  - local logged-in QA confirmed teacher session detail shows the new summary cards and jump links while keeping `Step 1 / Step 2`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-02-r05 Deployed

- Scope: finance attachment-repair path follow-up for admin expense claims and receipt approvals.
- Business impact:
  - finance users now get direct repair shortcuts inside the selected expense-claim review area when an attachment is missing
  - finance payout groups now expose immediate repair/history shortcuts when one of the selected claims still has an attachment problem
  - receipt approvals now gives a dedicated proof-repair card before the detail/action area when proof is missing or the linked file is broken
  - no approval order, payment rule, queue source, receipt creation rule, or expense-claim business workflow changed
- Validation:
  - `npm run build`
  - selected expense-claim review area now surfaces `Attachment repair path / 附件修复路径` with direct queue/history shortcuts
  - selected finance payout group now surfaces direct repair/history shortcuts when one or more claims have missing attachments
  - selected receipt detail now surfaces `Proof repair path / 凭证修复路径` before the approval controls when proof is missing or the linked file is broken
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`

## 2026-04-02-r03 Deployed

- Scope: admin workspace task-first UI rollout across navigation, homepage, todo center, students, receipts, expense claims, packages, and feedback pages.
- Business impact:
  - admin sidebar becomes grouped/collapsible so operators scan by task area instead of one long dense menu
  - admin homepage and todo center now lead with current work and next actions instead of long setup/supporting blocks
  - students, student detail, receipts, expense claims, packages, and feedback pages now share the same workbench framing before long forms and tables
  - no admin routes, permissions, approval order, attendance rules, billing logic, package logic, feedback logic, or student business logic changed
- Validation:
  - `npm run build`
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - manual logged-in QA confirmed current production still shows the older dense admin information architecture, which matches the intended value of this rollout

## 2026-04-02-r04 Deployed

- Scope: targeted admin/teacher UX follow-ups plus shared local business-file-storage abstraction for expense claims, payment proofs, partner payment proofs, shared docs local fallback, and ticket attachments.
- Business impact:
  - finance/admin screens surface attachment issues earlier without changing approval order, payment rules, or queue data
  - students page remembers the last queue when re-opened without an explicit view and gives a direct escape hatch when `today` queues are empty
  - teacher session detail now nudges `attendance first -> feedback second` without blocking feedback submission
  - expense claims, parent payment proof, partner payment proof, shared-doc local fallback, and ticket attachment paths now go through one shared local storage helper instead of each route/page rebuilding disk paths separately
  - no DB schema, file URL shape, upload destination, route path, permission rule, or business workflow changed
- Validation:
  - `npm run build`
  - `npm run audit:upload-integrity` on local workspace only highlighted missing production uploads on the local machine; this was confirmed as environment mismatch, not a helper regression
  - local helper smoke cycle passed for store/read/delete across all currently wired prefixes
  - quick deploy completed on `feat/strict-superadmin-availability-bypass` and the post-deploy startup check confirmed branch alignment plus `admin/login -> 200`
  - logged-in live QA confirmed real attachment endpoints still return `200` or trigger the expected file-download flow for:
    - expense claim receipt route
    - parent payment proof route
    - partner payment proof static upload path
    - shared-doc download route
    - ticket attachment route

## 2026-03-31-r3 Ready For Deploy

- Scope: fix teacher session visibility window and align availability date-only handling with business timezone in teacher/admin views.
- Business impact:
  - teacher `My Sessions / 我的课次` now shows the next `30` days instead of stopping at day `14`
  - availability dates no longer drift across days because teacher/admin date routes now use business-date parsing/formatting consistently
  - Yunfeng's April schedule and availability were verified on production data before patching; no underlying lesson rows were missing
- Validation:
  - `npm run build`
  - direct production data probe showed `46` April sessions for Yunfeng
  - direct production data probe showed intact weekly template plus `57` April date-availability rows

## 2026-03-26-r1 Deployed

- Deployed: group package alignment is live on the current production branch lineage.
- Scope: use one shared preferred-package rule for group enrollment preview, actual enrollment, attendance default ordering, and balance preview.
- Business impact: group classes prefer `GROUP_MINUTES`; legacy `GROUP_COUNT` remains fallback. 1-on-1 logic unchanged.
- Validation:
  - `npm run build`
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - group enrollment preview result matches enrollment submit result
  - legacy `GROUP_COUNT` preview is not blocked by minute-duration comparison

## 2026-03-26-r2 Deployed

- Deployed: waived-attendance todo fix is live on the current production branch lineage.
- Scope: todo deduction summary respects `waiveDeduction` and does not flag assessment lessons as pending deduction.
- Business impact: dashboard/todo card messaging only. Attendance save and package deduction behavior unchanged.
- Validation:
  - `npm run build`
  - waived attendance sessions show `No deduction required / 无需减扣` in todo center
  - `bash ops/server/scripts/new_chat_startup_check.sh`

## 2026-03-26-doc-status Deployed

- Deployed: release document alignment patch is live on the current production branch.
- Scope: close out startup-check mismatch findings and keep release docs consistent with the actual deployed branch state.
- Business impact: none. Documentation/process alignment only.

## 2026-03-26-r3 Deployed

- Deployed: backend integrity hardening is live on the current production branch lineage.
- Scope: backend integrity hardening for scheduling, top-up, expense claim transitions, and teacher availability cleanup.
- Business impact:
  - exact duplicate `Session` writes are now blocked by DB uniqueness plus controlled `409` handling
  - admin/teacher availability creation rejects overlapping ranges instead of silently stacking slots
  - historical availability data has already been normalized in the production database and post-clean audit is clean
- Validation:
  - `npm run test:backend`
  - `npm run build`
  - `npm run audit:availability-integrity`
  - `npx prisma migrate deploy`
- Deploy note:
  - production DB cleanup + migrations were applied and the application branch has now been deployed
  - `bash ops/server/scripts/new_chat_startup_check.sh` confirms local/origin/server are aligned on the live branch head
  - release-doc closeout is tracked as a docs-only follow-up on the same production branch lineage

## 2026-03-27-r1 Deployed

- Scope: optimistic-lock retry guard for `partner/parent billing` blob stores and related approval writes.
- Business impact:
  - concurrent `AppSetting` JSON writes in billing/approval flows are retried against latest `updatedAt`
  - conflicting writes now fail explicitly instead of silently overwriting another operator's invoice / receipt / approval update
  - existing invoice / receipt / approval data structure and UI flow stay unchanged
- Validation:
  - `npm run test:backend`
  - `npm run build`
  - billing optimistic-lock regression tests pass

## 2026-03-29-r1 Deployed

- Scope: hotfix approval JSON hydration for parent receipt, partner receipt, and partner settlement approval stores after the optimistic-lock rollout.
- Business impact:
  - stored approval rows now load from `AppSetting` arrays correctly instead of falling back to empty state
  - manager/finance receipt approval status is preserved and visible again
  - no route, permission, or approval-order rules changed
- Validation:
  - `npm run test:backend`
  - `npm run build`
  - parent receipt approval regression test reads an existing stored approval row successfully

## 2026-03-29-r2 Deployed

- Scope: add a non-runtime guardrail for the `AppSetting` optimistic-lock helper contract.
- Business impact:
  - no business flow or route behavior change
  - future JSON-store callers are less likely to mis-handle already-parsed `sanitize` input
- Validation:
  - `npm run test:backend`
  - parsed-json contract test for `loadJsonAppSettingForDb` passes

## 2026-03-30-r1 Deployed

- Scope: expense-claim duplicate-submit guard and Ahmar duplicate-row cleanup.
- Business impact:
  - repeated taps on expense submission no longer create many identical `SUBMITTED` claims
  - teacher/admin expense forms disable the submit button after the first tap
  - Ahmar's duplicated `2026-03-29` transport claims were reduced to one retained claim plus duplicate file cleanup
  - historical missing file cases are not auto-rewritten; those still require recovery or re-upload
- Validation:
  - `npm run test:backend`
  - `npm run build`
  - duplicate expense-claim lookup regression test passes

## 2026-03-30-r2 Deployed

- Scope: controlled admin route for parent payment proof open/preview in receipt approvals.
- Business impact:
  - admin receipt approvals no longer depends on direct static `relativePath` links for parent payment proof files
  - payment proof open/preview now resolves from `paymentRecordId`, which avoids false "404 means no upload" conclusions when original filename and stored filename differ
  - upload, receipt creation, and approval logic remain unchanged
- Validation:
  - `npm run build`
  - admin receipt approvals uses `/api/admin/parent-payment-records/[id]/file` for parent payment proof open/preview

## 2026-03-30-r3 Deployed

- Scope: allow rejected expense claims to be corrected and resubmitted back to `SUBMITTED`.
- Business impact:
  - teachers can resubmit a rejected claim instead of creating a second claim manually
  - resubmit clears reject markers and sends the original claim back into the approval queue
  - approval, payment, and archive rules remain unchanged
- Validation:
  - `npm run test:backend`
  - `npm run build`
  - manual deploy check confirms `local/origin/server = fa1d341`
  - `https://sgtmanage.com/admin/login` returns `200`
- Release closeout: release-doc gate follow-up synced in the next docs commit on the same live branch lineage.

## 2026-03-30-r4 Deployed

- Scope: teacher expense-claim UX wording/visibility polish for status labels, attachment health, and rejected-claim next-step guidance.
- Business impact:
  - statuses now read as bilingual human language instead of raw status codes
  - missing attachments are explicitly labeled instead of only failing through open/download links
  - rejected claims show a clearer bilingual action card to guide correction and resubmission
  - no approval, payment, or archive rule changed
- Validation:
  - `npm run build`

## 2026-03-30-r5 Deployed

- Scope: receipt approval page low-risk UX polish for queue readability and main-action focus.
- Business impact:
  - queue status and action labels are clearer and more bilingual
  - selected receipt panel now emphasizes the active item and main review action
  - fix/revoke/package-billing tools are tucked under `More actions / 更多操作`
  - no approval order, permission, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r6 Deployed

- Scope: receipt approval flow smoothing with next-item auto-advance, standardized reject reasons, and a lightweight timeline.
- Business impact:
  - after approve/reject/revoke, the review flow can carry forward to the next queue item instead of forcing a manual reselect
  - reject actions now use standardized bilingual reason options with optional detail for clearer operator guidance
  - the selected receipt panel shows a lightweight bilingual timeline for created / approved / rejected milestones
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r7 Deployed

- Scope: receipt approval worklist polish with task-first queue ordering, clearer post-action success messaging, and action-oriented risk guidance.
- Business impact:
  - pending risky items now sort ahead of completed items so the queue behaves more like a to-do list
  - success banners explain both the action result and whether the page moved to the next item
  - risk boxes now include clearer bilingual suggested next steps instead of only describing the problem
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r8 Deployed

- Scope: receipt approval role-focus polish with weaker completed rows, clearer queue risk badges, and a stronger cue for the operator's current action area.
- Business impact:
  - completed queue items are visually reduced so unfinished work stands out more clearly
  - queue rows now show bilingual risk badges like missing proof / file missing / ready
  - selected receipt panel now explicitly shows the operator's current role focus
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r9 Deployed

- Scope: receipt approval bucketed queue with separate sections for my next actions, other open items, and completed history.
- Business impact:
  - unfinished work is now visually grouped into clearer operator buckets
  - completed items are pushed into a history section so they no longer compete with open review work
  - selected receipt details and approval actions stay on the same page and follow the same rules
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r10 Deployed

- Scope: receipt approval focus filters and collapsed history controls.
- Business impact:
  - queue header now shows bilingual count summaries for work buckets
  - operators can quickly focus on only their own work, only open work, or only history
  - completed history is collapsed by default to keep attention on active review work
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r11 Deployed

- Scope: receipt approval queue fix shortcuts and higher-priority ordering for missing proof/file issues.
- Business impact:
  - risky parent receipt rows now expose a direct `Fix payment proof / 修复缴费凭证` shortcut from the queue
  - missing proof and file-missing problems now rise above generic review items inside the queue
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r12 Deployed

- Scope: receipt approval QA follow-up fixes for risk-message consistency, duplicated bilingual copy, and empty-my-actions default selection behavior.
- Business impact:
  - right-side receipt details now reflect the same file-missing and missing-proof risk state shown in the queue
  - duplicated bilingual labels in the queue and detail panel are reduced back to a single readable bilingual line
  - `Only my actions / 只看我待处理的` no longer auto-selects unrelated open work when the current operator has zero pending items
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r13 Deployed

- Scope: receipt approval selected-panel copy cleanup.
- Business impact:
  - remaining duplicated bilingual labels in the selected receipt timeline, action cards, and more-actions area are reduced back to one readable bilingual line
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r14 Deployed

- Scope: receipt approval batch-flow wording, stronger risk tiers, and fix-flow return guidance.
- Business impact:
  - selected receipt actions now make it clearer when the operator can approve or reject and continue directly to the next item
  - queue risk badges now separate blocker items from softer review checks, with a short bilingual risk-detail hint in each row
  - fix flows now provide a clearer bilingual link back to the currently selected receipt review item
  - no approval order, permission, receipt creation, or finance data flow changed
- Validation:
  - `npm run build`

## 2026-03-30-r15 Deployed

- Scope: expense-claim submit pending-state hotfix for browser validation failures.
- Business impact:
  - missing required fields or files no longer make the expense submit button get stuck on `Submitting...`
  - valid expense submits still lock the button once a real submit starts
  - no expense validation rule, approval rule, or duplicate-submit logic changed
- Validation:
  - `npm run build`

## 2026-03-30-r16 Deployed

- Scope: teacher expense-claim form guidance polish.
- Business impact:
  - teachers now see a clearer bilingual checklist before submit
  - transport, attachment, and purpose fields now explain what to fill in more directly
  - no expense validation rule, approval rule, or duplicate-submit logic changed
- Validation:
  - `npm run build`

## 2026-03-30-r17 Deployed

- Scope: expense-claim route-stability fix for teacher/admin submit flows.
- Business impact:
  - teacher new submit and rejected-claim resubmit now go through stable POST routes instead of deployment-sensitive Server Action ids
  - admin self-submit for expense claims now uses the same stable-route pattern
  - validation, duplicate-submit guard, approval, payment, and archive rules stay unchanged
- Validation:
  - `npm run build`

## 2026-03-31-r01 Deployed

- Scope: expense submit-button timing hotfix for browsers that cancel native form submission when the clicked submit button disables itself too early.
- Business impact:
  - teacher/admin expense submit buttons still lock after a valid submit starts
  - mobile browsers now get a chance to send the real multipart POST before the button becomes disabled
  - no expense validation rule, duplicate-submit guard, approval, payment, or archive logic changed
- Validation:
  - `npm run build`

## 2026-03-31-r02 Deployed

- Scope: teacher expense-claim withdraw flow for submitted claims.
- Business impact:
  - teachers can withdraw their own `SUBMITTED` expense claims before approval if they uploaded the wrong file or details
  - withdrawn claims are preserved for audit as `WITHDRAWN` instead of being hard-deleted
  - approval, reject, paid, and archive paths for existing claims stay unchanged
- Validation:
  - `npm run build`

## 2026-03-31-r03 Deployed

- Scope: teacher expense-claim default list hides withdrawn items.
- Business impact:
  - teachers no longer see `WITHDRAWN / 已撤回` claims mixed into the default `All active claims / 全部有效报销单` view
  - withdrawn claims remain available through the explicit status filter when needed
  - no submit, withdraw, approval, payment, or archive rules changed
- Validation:
  - `npm run build`

## 2026-03-31-r04 Deployed

- Scope: upload ops toolkit for backup, integrity audit, disk alerts, and large-directory reporting.
- Business impact:
  - operators can now audit whether upload records still point to files that exist on disk
  - server can be configured to alert earlier when storage usage climbs or upload files go missing
  - uploads can be archived to S3-compatible object storage on a schedule without changing runtime upload behavior
  - no upload route, receipt flow, expense flow, or approval rule changed
- Validation:
  - `npm run audit:upload-integrity`
  - `bash ops/server/scripts/check-disk-usage.sh`
  - `bash ops/server/scripts/report-large-dirs.sh`
  - `npm run build`

## 2026-03-31-r05 Deployed

- Scope: object-storage backup upload hotfix for archive files.
- Business impact:
  - upload archive backups now avoid the multipart code path that the current S3-compatible endpoint rejected with `MissingContentLength`
  - runtime business uploads, receipt access, expense-claim files, and ticket files stay unchanged
- Validation:
  - `bash -n ops/server/scripts/upload_object_storage_s3.sh`
  - manual backup archive upload succeeds against the configured object-storage bucket

## 2026-03-31-r06 Deployed

- Scope: admin student list counter fix.
- Business impact:
  - `Full List / 完整列表` now shows the true total number of students instead of reusing the current filtered-view count
  - `Showing x / y` and pagination continue to reflect the active filter correctly
  - no student records, filters, or edit/delete behavior changed
- Validation:
  - `npm run build`
  - production total verified as `73`

## 2026-03-31-r07 Deployed

- Scope: partner settlement page workflow reorder.
- Business impact:
  - daily settlement work now focuses on pending billing records and pending online/offline queues before history and setup
  - invoiced history is separated into its own collapsed section to reduce clutter
  - rate settings and package mode config are moved into a collapsed `Settlement setup / 结算配置` area
  - no settlement rules, rates, permissions, invoice creation, or revert logic changed
- Validation:
  - `npm run build`

## 2026-03-31-r08 Deployed

- Scope: partner settlement focus helpers and history filters.
- Business impact:
  - finance and management users can now pick one queue row and work from a sticky `Selected item / 当前处理项` panel instead of scanning large tables
  - the page now exposes an `Integrity workbench / 异常工作台` section with direct repair/report links
  - invoiced history can be filtered by all records, invoice-only items, or records that already have receipts
  - no settlement rules, amounts, permissions, invoice creation, or revert behavior changed
- Validation:
  - `npm run build`

## 2026-03-31-r09 Deployed

- Scope: partner settlement action-focused wording and grouped warning summary.
- Business impact:
  - the sticky selected-item panel now presents clearer direct-action labels such as `Review billing record`, `Create online settlement`, and `Fix attendance issues`
  - the integrity workbench now shows grouped warning counts for missing feedback rows and status-excluded rows
  - no settlement logic, billing flows, permissions, or calculations changed
- Validation:
  - `npm run build`

## 2026-03-31-r10 Deployed

- Scope: partner settlement direct actions and warning review shortcuts.
- Business impact:
  - the sticky `Selected item / 当前处理项` panel can now directly trigger online or offline settlement creation instead of sending the user back to the queue first
  - the integrity workbench warning cards now provide `Review first row / 查看首条` shortcuts for missing-feedback and status-excluded groups
  - no settlement formulas, permission rules, invoicing, or revert semantics changed
- Validation:
  - `npm run build`

## 2026-03-31-r11 Deployed

- Scope: partner settlement history open-state fix.
- Business impact:
  - `Open history / 打开历史` from the overview card now opens the billing history section instead of only jumping to a collapsed anchor
  - no settlement actions, warnings, billing flows, or permission checks changed
- Validation:
  - `npm run build`

## 2026-03-31-r12 Deployed

- Scope: partner settlement Todo Center shortcut fix.
- Business impact:
  - `Open todo center / 打开待办中心` inside the integrity workbench now opens the real admin todo page instead of a 404 route
  - no settlement actions, repair logic, warnings, or permissions changed
- Validation:
  - `npm run build`

## 2026-04-01-r01 Deployed

- Scope: admin expense-claim review queue and selected-claim workflow polish.
- Business impact:
  - the page now leads with a dedicated submitted-claim queue instead of making managers scan one full table first
  - a selected-claim panel keeps attachment preview, claim details, and approval actions together in one place
  - `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条` speed up multi-claim review
  - the full claim list is still available below in a collapsed details/history section
  - no approval rules, rejection rules, finance payment rules, or archive behavior changed
- Validation:
  - `npm run build`

## 2026-04-01-r02 Deployed

- Scope: admin expense-claim review-page noise reduction.
- Business impact:
  - the main review queue now appears before reminders and before the self-submit tool, so management lands on the approval workflow faster
  - follow-up reminders are condensed into a collapsed summary block instead of expanding a long list above the queue
  - the collapsed full-history section no longer preloads receipt thumbnails, which reduces avoidable 404 console noise from legacy missing files
  - no expense approval, rejection, payment, archive, or export rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r03 Deployed

- Scope: admin expense-claim finance queue and selected payout flow.
- Business impact:
  - finance users now get a dedicated `Approved unpaid / 已批未付` queue instead of working only from the mixed full-history table
  - a `Selected payout item / 当前付款项` panel keeps payment method, reference, batch month, and remarks together in one place
  - `Mark paid & next / 标记已付款并下一条` speeds up multi-claim finance processing
  - no approval, rejection, archive, export, or payment-record persistence rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r04 Deployed

- Scope: admin expense-claim grouped batch payout flow for finance.
- Business impact:
  - approved unpaid claims now group by submitter and currency so finance can process a teacher's batch together
  - each group opens into a shared payment form with checkboxes for included claims
  - finance can mark selected claims paid in one action with shared payment details instead of repeating the same form claim by claim
  - the underlying payment write path and audit trail remain claim-level and unchanged
- Validation:
  - `npm run build`

## 2026-04-01-r05 Deployed

- Scope: expense-claim filter clarity on the admin review page.
- Business impact:
  - the page now separates `Quick work filters / 工作流快速筛选` from `Advanced filters / 高级筛选`
  - finance and management users get a clearer explanation that the active filter set affects the review queue, finance queue, full history list, and CSV export together
  - no approval, payment, archive, grouping, or export rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r06 Deployed

- Scope: receipt-approval finance queue readability and width reduction.
- Business impact:
  - the unified receipt queue now uses compact card items instead of a wide 9-column table
  - core finance triage stays visible without horizontal scrolling on normal-width laptop screens
  - invoice number, progress, and risk detail move into compact supporting text and the full review context remains on the right-side selected panel
  - no receipt approval, reject, redo, receipt creation, or payment-record rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r07 Deployed

- Scope: receipt-approval package-mode clarity for finance users.
- Business impact:
  - selecting one package now switches the page into a clearer `Package finance workspace / 课包财务工作区` context
  - a dedicated top context card shows the student, course, package id, current step, and a clear way back to the global receipt queue
  - the package workspace opens by default, while the global receipt queue stays available as a secondary section instead of competing with the current package flow
  - no receipt approval, reject, redo, receipt creation, or payment-record rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r08 Deployed

- Scope: admin sign-in alert workbench readability.
- Business impact:
  - the admin sign-in alert page now groups all issues for one session into one warning card instead of mixing teacher-sign-in, student-sign-in, and feedback rows inside a wide table
  - teaching staff can switch between `All open sessions`, `Urgent first`, `Attendance only`, and `Feedback only` without scanning unrelated rows
  - alert settings stay available in a secondary collapsed block, while the main page leads with action-focused session cards and clearer next-step guidance
  - no alert thresholds, sync rules, attendance marking logic, or feedback rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r09 Deployed

- Scope: sign-in alert quick-focus summary alignment.
- Business impact:
  - when users switch to `Urgent first`, `Attendance only`, or `Feedback only`, the top summary cards now shrink to match the currently filtered queue
  - this removes the confusing state where the queue looked filtered but the summary still showed full-page totals
  - no alert thresholds, sync rules, card grouping, or action links changed
- Validation:
  - `npm run build`

## 2026-04-01-r10 Deployed

- Scope: package-create flow clarity on the admin packages page.
- Business impact:
  - the create-package modal now guides staff through four steps instead of one long stacked form
  - a live `Package summary / 课包摘要` card keeps the selected student, course, package type, balance, validity, payment, and settlement mode visible while editing
  - sharing fields and internal notes move into an advanced section so common package creation stays simpler
  - no package creation API rules, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r11 Deployed

- Scope: package-create defaults and reminders on the admin packages page.
- Business impact:
  - the default package type now starts from `HOURS / 课时包`, which better matches common teaching-office usage
  - common minute presets reduce repeated manual typing during package creation
  - selecting a student now shows active-package and same-course reminders before staff create another package
  - no package creation API rules, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r12 Deployed

- Scope: package-create smart defaults and duplicate-package warnings on the admin packages page.
- Business impact:
  - selecting a course now auto-suggests the most common minute balance used for that course
  - staff still keep full control because manual minute edits are not overwritten after they start typing
  - the final review step now shows a stronger yellow warning when the selected student already has active packages for the same course
  - no package creation API rules, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r13 Deployed

- Scope: package-create minute presets and fallback defaults aligned to real teaching-office package patterns.
- Business impact:
  - regular package creation now surfaces 10h / 20h / 40h / 100h quick presets instead of mixed minute chips
  - New Oriental partner students now get 45-minute lesson presets (6 / 8 / 10 / 20 / 40 lessons), which better matches how those packages are sold and recorded
  - course-based suggested balances still apply first, while fallback defaults now follow the more realistic package patterns for each student context
  - no package creation API rules, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r14 Deployed

- Scope: package-create ACTIVE defaults and package edit/top-up clarity improvements.
- Business impact:
  - newly created packages now default to `ACTIVE`, which better matches common teaching-office workflow
  - the package modal now separates `Edit package / 编辑课包` and `Top-up / 增购` into clearer focused flows instead of mixing both jobs inside one long form
  - top-up now shows a before/after balance summary and realistic quick-add presets for regular packages and New Oriental partner packages
  - no package creation API rules, top-up API behavior, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r15 Deployed

- Scope: package edit/top-up follow-up polish.
- Business impact:
  - less-common edit fields now stay inside a collapsed advanced block, so everyday validity/status edits are easier to scan
  - edit mode only expands paid-related fields when staff explicitly mark the package as paid
  - top-up now shows a stronger human-readable confirmation sentence with student, course, and before/after balance values before submission
  - no package update API rules, top-up API behavior, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r16 Deployed

- Scope: package edit/top-up context card.
- Business impact:
  - the package modal now shows a stronger top context card so staff can always see the student, course, source, status, remaining balance, and total balance before editing or topping up
  - switching between `Edit package / 编辑课包` and `Top-up / 增购` no longer feels like changing to a different record because the current package context stays fixed at the top
  - no package update API rules, top-up API behavior, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r17 Deployed

- Scope: package modal mode-layout polish for edit and top-up.
- Business impact:
  - switching to `Top-up / 增购` now moves the top-up form directly under the fixed package context card, instead of keeping it visually buried below edit-only layout structure
  - the package modal now behaves more like two focused modes sharing one context, which reduces teaching-office confusion when they switch from editing to topping up
  - no package update API rules, top-up API behavior, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r18 Deployed

- Scope: searchable shared-student and shared-course selectors in package create/edit flows.
- Business impact:
  - package create and package edit now use searchable add/remove pickers instead of long native multi-select boxes for `Shared Students / 共享学生` and `Shared Courses / 共享课程`
  - the current student and course are excluded from their own sharing lists, which reduces accidental self-selection
  - shared student results now show source and active-package context to make similar names easier to distinguish
  - no package creation API rules, package update API behavior, top-up API behavior, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r19 Deployed

- Scope: package sharing selection summaries and same-course warnings.
- Business impact:
  - package create and package edit now show how many shared students and shared courses are currently selected, so teaching staff can confirm scope without reopening the picker
  - both forms now show a yellow warning when selected shared students already have an active package for the same course, which reduces accidental duplicate sharing across the same course
  - no package creation API rules, package update API behavior, top-up API behavior, settlement mode behavior, overlap checks, or ledger writes changed
- Validation:
  - `npm run build`

## 2026-04-01-r20 Deployed

- Scope: teacher payroll work queue and anomaly-filter pass.
- Business impact:
  - teacher payroll now shows a role-aware `My work queue / 我的待处理` so management and finance can jump into the next teacher that needs action instead of scanning the full salary table first
  - the page now surfaces a `Selected payroll / 当前处理老师` panel with the next workflow action, which reduces table-scanning and hidden-details clicks
  - teacher payroll detail now supports quick anomaly filters for pending rows, fallback-rate rows, and cancelled-but-charged rows
  - no payroll calculation logic, send flow, approval rules, finance payout rules, or audit logging changed
- Validation:
  - `npm run build`

## 2026-04-01-r21 Deployed

- Scope: teacher payroll finance batch payout and exception-summary follow-up.
- Business impact:
  - finance can now batch-mark multiple finance-ready teachers as paid from the payroll work queue instead of processing one teacher at a time
  - the selected payroll panel now highlights pending sessions, cancelled-but-charged sessions, fallback-rate combos, and approval timeline context before the operator takes action
  - teacher payroll detail now surfaces exception summary cards at the top so staff can see pending/fallback/charged issues before scanning the full tables
  - no payroll calculation logic, send flow, approval rules, finance payout rules, or audit logging changed
- Validation:
  - `npm run build`

## 2026-04-01-r22 Deployed

- Scope: teacher payroll status-clarity follow-up for teachers and finance.
- Business impact:
  - teacher self-service payroll now shows a clearer bilingual stage card so staff can tell whether the sheet is waiting for teacher confirmation, manager approval, finance confirmation, payout, or has been returned by finance
  - teacher payroll detail anomaly summary cards now jump directly into the matching filtered rows, which reduces extra clicks when drilling into pending, fallback-rate, or cancelled-but-charged issues
  - finance batch payout now shows a currency-group summary before payout so finance can understand payable totals by currency at a glance
  - no payroll calculation logic, send flow, approval rules, finance payout rules, or audit logging changed
- Validation:
  - `npm run build`

## 2026-04-01-r23 Deployed

- Scope: teacher payroll current-owner guidance on the teacher self-service page.
- Business impact:
  - teacher payroll now explicitly shows which side currently owns the flow and what the next expected step is, instead of only showing a high-level status label
  - waiting-for-manager, waiting-for-finance, waiting-for-payout, and finance-returned states are now easier for teachers to understand without asking operations for clarification
  - no payroll calculation logic, send flow, approval rules, finance payout rules, or audit logging changed
- Validation:
  - `npm run build`

## 2026-04-01-r24 Deployed

- Scope: teacher payroll action-clarity and finance grouping follow-up.
- Business impact:
  - teacher payroll now clearly tells teachers whether they need to act right now, instead of only showing a status label and owner hint
  - teacher payroll milestones are now shown as a visual timeline for sent, teacher confirm, manager approve, finance confirm, and payout
  - finance-ready payroll queue now shows how many teachers in each currency group are clean vs still carrying issues, so payout batches are easier to judge at a glance
  - no payroll calculation logic, send flow, approval rules, finance payout rules, or audit logging changed
- Validation:
  - `npm run build`

## 2026-04-01-r25 Deployed

- Scope: first-round teacher portal cleanup with grouped navigation, teacher-side language switching, and a today-first dashboard.
- Business impact:
  - teachers now get a clearer `Today / My Work / Schedule / Finance` information architecture instead of a flat menu feel
  - the teacher homepage now prioritizes today, task cards, schedule, and finance so the portal feels more like a workbench and less like a mini admin backend
  - teachers can now switch `中文 / English / Bilingual` directly from the teacher portal sidebar
  - no teacher auth, attendance, feedback, availability, payroll, or expense-claim business rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r26 Deployed

- Scope: unify high-frequency teacher pages under the new teacher workspace visual language.
- Business impact:
  - teacher `My Sessions`, `My Availability`, `My Expense Claims`, and `My Payroll` now open with the same teacher-workspace hero and summary-card structure as the refreshed dashboard
  - each page now gives a clearer first-screen explanation of what it is for and where to go next, which should reduce the “looks messy / hard to orient” feedback from teachers
  - no attendance rules, availability editing rules, expense-claim rules, or payroll workflow rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r27 Deployed

- Scope: bring teacher alerts, feedbacks, and tickets into the same teacher-workspace first-screen structure.
- Business impact:
  - teacher `Sign-in Alerts` now starts with the same workspace hero and summary cards as the refreshed teacher dashboard, sessions, availability, expense claims, and payroll pages
  - teacher `Student Feedbacks` now leads with handoff-focused summary cards and a clearer filter workspace before the student timeline list
  - teacher `Ticket Board` now leads with open/urgent/missing-proof summaries and a clearer filter card before the ticket table
  - no sign-in alert sync logic, feedback timeline read/write logic, ticket transition rules, or proof-file access rules changed
- Validation:
  - `npm run build`

## 2026-04-01-r28 Deployed

- Scope: bring teacher card and midterm-report pages into the same teacher-workspace first-screen structure.
- Business impact:
  - teacher `My Teacher Card` now starts with the same workspace hero and summary cards before intro editing and PDF export
  - teacher `Midterm Reports` now starts with the same workspace hero and task summaries before the report list
  - teacher midterm report detail now starts with a clearer report context header and summary cards before the long evaluation form
  - no teacher intro save behavior, midterm report save/submit rules, report lock rules, or PDF export logic changed
- Validation:
  - `npm run build`

## 2026-04-02-r01 Deployed

- Scope: reduce first-screen density on teacher expense claims and teacher payroll.
- Business impact:
  - teacher `My Expense Claims` now surfaces the most common next actions first, keeps new-claim creation in a lighter secondary block, and moves the full claim list/history behind a disclosure so the first screen is less crowded in bilingual mode
  - teacher `My Payroll` now focuses first on the current action/status card and moves the detailed payroll calculations behind a disclosure so the page feels less like a dense admin report
  - no expense-claim submission, resubmission, withdrawal, payroll calculation, teacher confirmation, or payroll approval rules changed
- Validation:
  - `npm run build`

## 2026-04-02-r02 Deployed

- Scope: collapse low-priority teacher sidebar groups and page guides.
- Business impact:
  - teacher sidebar groups now collapse by work area so bilingual mode no longer shows every navigation block expanded at once
  - the currently active teacher area auto-expands, which keeps orientation clear without forcing the whole sidebar open
  - teacher workspace hero subtitles now live behind a `Quick guide / 快速说明` disclosure, reducing first-screen text density across teacher pages
  - no teacher auth, navigation permissions, attendance, availability, payroll, expense-claim, or report logic changed
- Validation:
  - `npm run build`

## 2026-04-02-r16 Deployed

- Scope: remember the last admin students desk context, not just the queue label.
- Business impact:
  - `/admin/students` now restores the operator's last queue together with lightweight search context (`q`, source, type, and page size) when the page is reopened without explicit URL params
  - the resumed-desk banner now explains that both queue and filters were restored, and gives a direct way back to the default student desk
  - explicit `view` and search params still win, so deep links and one-off filtered URLs keep their intended behavior
  - no student creation, deletion, filtering semantics, pagination semantics, or student profile/business rules changed
- Validation:
  - `npm run build`

## 2026-04-02-r17 Deployed

- Scope: remember the last admin todo desk context and add direct next-step shortcuts.
- Business impact:
  - `/admin/todos` now restores the last warning thresholds and desk toggles when the page is reopened without explicit URL params, so operators do not need to rebuild the same working context each time
  - the page now shows a resumed-desk hint plus direct jump links back to today's attendance queue, overdue follow-up, system checks, and reminder desk when those areas are active
  - explicit URL params still win, so one-off todo deep links keep their intended behavior without remembered-state override
  - no attendance task calculation, reminder confirmation logic, conflict-audit logic, deduction repair logic, or renewal-alert logic changed
- Validation:
  - `npm run build`

## 2026-04-02-r18 Deployed

- Scope: unify attachment anomaly visibility into a single admin workbench and connect finance anomaly links back to it.
- Business impact:
  - `/admin/recovery/uploads` now acts like an `Attachment Health Desk`, with summary metrics, source filters, workflow shortcuts, and the existing bulk re-upload recovery action on one page
  - finance users can now open the attachment-health desk directly from the finance/review navigation instead of being redirected away
  - receipt proof issues and expense attachment issues now expose a direct jump into the global anomaly desk, while still keeping their local queue views available
  - no attachment storage rules, receipt approval logic, expense approval logic, recovery matching logic, or ticket workflow logic changed
- Validation:
  - `npm run build`

## 2026-04-02-r19 Deployed

- Scope: reduce context loss on the admin student detail page with a sticky action bar and section return links.
- Business impact:
  - `/admin/students/[id]` now keeps a sticky `Student workbench` bar in view so operators can jump between packages, attendance, upcoming sessions, planning, edit actions, and export without rescanning the long page
  - the major student-detail sections now include lightweight return bars that point back to the sticky workbench or the next likely section
  - no student edit logic, quick-schedule logic, attendance filter logic, package/billing logic, or session action logic changed
- Validation:
  - `npm run build`

## 2026-04-02-r20 Deployed

- Scope: speed up teacher availability editing with reusable templates and quick date-copy actions.
- Business impact:
  - `/teacher/availability` now provides common templates that can preload either quick-add or bulk-add forms for common weekday/weekend patterns
  - the page now supports quick date-to-date copy plus one-click `Copy +1d` and `Copy +7d` actions directly from calendar days that already have slots
  - no availability overlap rules, clear-day behavior, undo behavior, or slot save/delete APIs changed
- Validation:
  - `npm run build`

## 2026-04-02-r21 Deployed

- Scope: add completion-state guidance to teacher session detail so the page more clearly moves from attendance into feedback and then into a finished state.
- Business impact:
  - `/teacher/sessions/[id]` now shows a `Completion state` banner that explains whether the teacher still needs to finish attendance, submit feedback, or can safely return to `My Sessions`
  - attendance save success now points the teacher directly toward the feedback section instead of leaving them on a generic saved message
  - feedback save success now explains that the session record is up to date while still leaving the form editable for revisions
  - no attendance save rules, feedback validation rules, routing rules, or session permissions changed
- Validation:
  - `npm run build`

## 2026-04-03-r01 Deployed

- Scope: trim repeated teacher-payroll copy on the first screen so the workflow reads once and the detailed calculations stay behind the disclosure.
- Business impact:
  - `/teacher/payroll` no longer repeats the same payroll stage as both a large summary card and a second status block
  - the first screen now focuses on total salary, sessions, total hours, cycle window, and one `What happens next` workflow card
  - the detailed calculation disclosure no longer repeats the same top-level payroll recap before the combo and session tables
  - no payroll calculation, teacher confirmation, approval-stage, payout, or finance-return logic changed
- Validation:
  - `npm run build`

## 2026-04-03-r02 Deployed

- Scope: hotfix duplicated bilingual labels on teacher payroll.
- Business impact:
  - teacher payroll status labels such as `What happens next`, `Current owner`, `Timeline`, stage pills, and owner names no longer render as repeated `EN / ZH / ZH / EN` text in bilingual mode
  - the page wording now reads once per label while keeping the same payroll workflow states and actions
  - no payroll calculation, teacher confirmation, approval-stage, payout, or finance-return logic changed
- Validation:
  - `npm run build`

## 2026-04-03-r03 Deployed

- Scope: first admin-side copy-clarity pass on high-frequency workbench pages.
- Business impact:
  - receipt approval now uses clearer `proof or file issues` wording instead of the slash-heavy label that looked like two competing filters
  - partner settlement now uses more natural invoice wording such as `Grouped by invoice number`, `Invoice line count`, and `Invoice created`
  - the admin students workbench search box now reads more naturally as `Search name, school, notes, or ID`
  - no receipt queue behavior, partner-settlement logic, invoicing logic, or student-search behavior changed
- Validation:
  - `npm run build`

## 2026-04-03-r12 Deployed

- Scope: mobile shell and form-overflow cleanup for teacher finance workbenches and admin receipt approvals.
- Business impact:
  - the shared admin/teacher app shell now keeps mobile-width content inside the viewport instead of letting `width: 100%` controls drift past the screen edge
  - teacher workbench hero actions now stack more cleanly on phone widths, which improves first-screen readability on payroll and expense pages without changing routes or actions
  - `/teacher/payroll` now uses the existing stacked filter-bar pattern on mobile, so the month/scope controls and `Apply / Clear` actions read as one clear block
  - `/admin/receipts-approvals` no longer lets the quick package selector or the receipt-creation/payment-proof forms overflow on mobile, because the old fixed 2/3/4-column grids now collapse responsively
  - no payroll calculations, receipt approval rules, payment-record logic, receipt creation logic, or remembered queue behavior changed
- Validation:
  - `npm run build`
  - local mobile-width QA confirmed `scrollWidth === clientWidth` on `/teacher/payroll`, `/teacher/expense-claims`, and `/admin/receipts-approvals`

## 2026-04-03-r19 Deployed

- Scope: remember-filter blank-param audit and reset-link fix across the remaining high-frequency admin workbenches.
- Business impact:
  - `/admin/students` now treats `clearDesk=1` as an intentional reset, so `Clear` and `Back to default desk` no longer reopen the last remembered queue/filter state
  - `/admin/expense-claims` now respects explicit blank submissions for status/month/type/currency/query/boolean queue toggles, and `Clear filters` now truly resets the workbench
  - `/admin/receipts-approvals` now treats blank month/view/queue params as intentional input and uses `clearQueue=1` for reset links, so finance can get back to the default queue without remembered-state bounce-back
  - `/admin/reports/partner-settlement` and `/admin/todos` now use explicit clear flags on their “back to default” shortcuts, so remembered month/panel/todo thresholds do not immediately resume after reset
  - `/admin/feedbacks` now respects an explicit student-filter clear path instead of silently reviving the last remembered student scope
  - no student filtering semantics, receipt approval logic, expense approval logic, settlement calculations, todo calculations, or remembered-state behavior on untouched pages changed
- Validation:
  - `npm run build`
  - production read-only QA on the affected pages
  - post-deploy startup check confirmed `local / origin / server = bd33bef`
  - release docs synced again in a follow-up docs-only pass to satisfy the release gate

## 2026-04-03-r20 Deployed

- Scope: add a separate final-report workflow for completed hour packages, with teacher-side fill pages and an admin-side assign / submitted / forwarded center.
- Business impact:
  - the system now has a dedicated `Final Reports / 结课报告` flow instead of overloading midterm reports for end-of-package summaries
  - teachers can open `/teacher/final-reports`, save drafts, and submit final reports assigned to their completed `HOURS` packages
  - admins can open `/admin/reports/final`, review completed-package candidates, manually assign a report to the relevant teacher, and mark submitted reports as forwarded
  - teacher and admin navigation now include final-report entries so the workflow is visible without relying on hidden links
  - no midterm-report logic, attendance/deduction logic, package balance logic, or finance logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy startup check
  - production read-only QA on `/teacher/final-reports` and `/admin/reports/final`

## 2026-04-03-r21 Deployed

- Scope: finish the first final-report workflow with admin PDF export and a clearer forwarded-to-parent action.
- Business impact:
  - admins can now download a printable PDF for each final report directly from `/admin/reports/final`
  - the forwarded action now reads as `Mark forwarded to parent`, which makes the operational intent clearer
  - forwarded reports now also display who marked them as forwarded, when that metadata is available
  - no final-report assignment rules, teacher submission logic, schema, attendance logic, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - production read-only QA on `/admin/reports/final`
  - production read-only QA on `/api/admin/final-reports/[id]/pdf`
  - release task record synced in a follow-up docs pass so the task file reflects the deployed state
  - final docs sync pass bundled changelog / release board / task in one commit for the release gate

## 2026-04-03-r22 Deployed

- Scope: add final-report delivery records, parent read-only share links, and a more formal PDF handoff version.
- Business impact:
  - `/admin/reports/final` now supports a real parent-delivery step with delivery channel, delivery note, delivery timestamp, and delivery actor tracking
  - admins can now generate, refresh, and disable tokenized parent share links directly from the final-report center
  - parents or operations can open `/final-report/[id]?token=...` as a read-only final-report page without needing an admin or teacher login
  - the admin PDF export now includes a clearer delivery-record section so it is easier to send as a parent-facing handoff document
  - no final-report assignment rules, teacher submit rules, midterm-report logic, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy startup check
  - production read-only QA on `/admin/reports/final`
  - production read-only QA on `/api/admin/final-reports/[id]/pdf`
  - production read-only QA on a tokenized `/final-report/[id]?token=...` share page

## 2026-04-03-r23 Deployed

- Scope: add expiry windows to final-report parent share links.
- Business impact:
  - `/admin/reports/final` now lets operations choose a 7 / 30 / 90 day validity window when creating or refreshing a parent share link
  - active share links now display when they expire, and expired links are surfaced separately from active ones
  - `/final-report/[id]?token=...` now blocks expired links the same way it blocks missing or revoked links
  - no teacher final-report content, delivery-record semantics, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy startup check
  - production read-only QA on `/admin/reports/final`
  - production read-only QA on `/final-report/[id]?token=invalid`

## 2026-04-03-r24 Deployed

- Scope: add share-link access audit to final-report parent read-only pages.
- Business impact:
  - `/final-report/[id]?token=...` now records first-view time, last-view time, and total view count
  - `/admin/reports/final` now surfaces whether a parent share link has ever been opened and when it was last viewed
  - no final-report content, delivery flow, expiry rules, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy startup check
  - production read-only QA on `/admin/reports/final`
  - production read-only QA on `/final-report/[id]?token=...`

## 2026-04-06-r01 Deployed

- Scope: add a teacher-payroll batch CSV export for finance.
- Business impact:
  - `/admin/reports/teacher-payroll` now exposes `Export CSV / 导出 CSV` next to the existing workbench filters
  - finance and admins can export the current payroll month, scope, teacher search, pending-only, and unsent-only view in one CSV file
  - the CSV includes salary totals and workflow milestones for every visible teacher row
  - no payroll math, teacher confirmation rules, approval flow, or payout behavior changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - production read-only QA on `/admin/reports/teacher-payroll`
  - production read-only QA on `/admin/reports/teacher-payroll/export`

## 2026-04-06-r02 Deployed

- Scope: add permanent delete support to shared documents and present shared-doc categories as clearer folder groups.
- Business impact:
  - `/admin/shared-docs` now groups visible files under category sections so operations can understand which logical folder each document belongs to
  - new shared-doc uploads now store into category-based paths such as `shared-docs/<category>/<yyyy-mm>/...`
  - admins can now permanently delete a shared document, which removes the database row and deletes the backing object from S3 or the local uploads directory
  - archive / restore behavior remains available and unchanged for documents that should stay in the library
  - no shared-doc permission rules, finance logic, payroll logic, attendance logic, or report logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - production UI check on `/admin/shared-docs`
  - production UI check confirmed `Delete / 删除` appears alongside `Archive / 归档`

## 2026-04-07-r01 Deployed

- Scope: fix shared-package midterm/final report routing so report candidates are generated per student instead of only per package owner.
- Business impact:
  - `/admin/reports/midterm` now creates and tracks candidate rows separately for each student who used the same shared `HOURS` package
  - `/admin/reports/final` now does the same for completed shared packages, so operations can push a final report to the correct student even when two students share one package
  - assign / exempt actions now validate the selected student against package ownership plus shared-student membership before creating or updating a report
  - existing report lookups now key off `package + student + teacher`, so pushing a report for one shared student no longer hides the other student's candidate
  - no report content fields, attendance deduction rules, package balances, payroll logic, or finance workflows changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - production read-only QA should confirm separate shared-package candidate rows on `/admin/reports/midterm` and `/admin/reports/final`

## 2026-04-07-r02 Deployed

- Scope: compress the final-report PDF into a single-page landscape layout.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` now generates a denser one-page handoff layout instead of the previous taller portrait layout
  - the overview, outcome, and delivery sections are more compact, and the narrative sections now render in a fixed multi-column grid
  - normal-length final reports should fit on one page without changing any underlying report content or workflow state
  - no final-report assignment logic, delivery/share behavior, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`

## 2026-04-07-r03 Deployed

- Scope: make the final-report PDF more parent-facing by removing internal delivery/admin metadata and hiding empty sections.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` now focuses the printable layout on student progress, end-of-course outcome, and the recommended next step
  - empty report sections no longer show `-` placeholders, so the page reads more like a finished handoff instead of a system export
  - delivery/admin-only details are still kept in the admin workbench, but they are no longer shown in the parent-facing PDF
  - no final-report data, assignment logic, delivery/share actions, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`

## 2026-04-07-r04 Deployed

- Scope: make the final-report PDF read more like a parent-facing continuation handoff by emphasizing the student's progress and the recommended renewal path.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` now frames the top summary as `Progress and continuation / 阶段成果与续课方向`
  - the package-completion line now reads like a completed learning-stage summary instead of a raw internal package metric
  - the previous short `Recommended next step` card is replaced with a fuller `Recommended continuation / 续课建议` narrative built from the teacher's recommendation, current level, and next-focus guidance
  - no final-report data, assignment logic, delivery/share actions, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`
