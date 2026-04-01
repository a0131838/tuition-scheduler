# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-03-30`
- Health check: `/admin/login` => `200`
- Version alignment: `ALIGNED`
- Exact server/local/origin commit hashes: use `bash ops/server/scripts/new_chat_startup_check.sh`

## Current Known State

- Local HEAD: current production branch head for `feat/strict-superadmin-availability-bypass`.
- Previous server fix remains in place: upload static paths under `/uploads/*` are reachable.
- `bash ops/server/scripts/new_chat_startup_check.sh` confirmed local/origin/server are aligned and `/admin/login` => `200`.
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
