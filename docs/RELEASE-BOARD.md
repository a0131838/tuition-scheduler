# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-04-25`
- Health check: `/admin/login` => `200`
- Version alignment: `ALIGNED`
- Exact server/local/origin commit hashes: use `bash ops/server/scripts/new_chat_startup_check.sh`

## Current Known State

- Local HEAD: current production branch head for `feat/strict-superadmin-availability-bypass`.
- Previous server fix remains in place: upload static paths under `/uploads/*` are reachable.
- `bash ops/server/scripts/new_chat_startup_check.sh` confirmed local/origin/server are aligned and `/admin/login` => `200`.
- Current release line on this branch: `2026-04-25-r122` (bilingual parent-facing teacher feedback prompts), intended for the next production deploy from this branch.
- `2026-03-26-r1`, `2026-03-26-r2`, and `2026-03-26-r3` are now live on the current server commit lineage.
- Release-doc gate requires `CHANGELOG-LIVE`, `RELEASE-BOARD`, and a matching `TASK-*` file in the same deploy commit.

## Open Risks

- Working tree hygiene risk: local repo currently contains unrelated untracked files and generated artifacts; avoid mixing them into deploy commits.
- Human memory risk: changes were spread across multiple sessions.
- Finance menu perception risk: role-based sidebar can look like "missing features" for FINANCE users.
- New process risk: deploy will fail if release docs are not included in the deploy commit.
- Historical risk confirmed: server env previously pointed to localhost DB in older backups.
- Migration order risk: the direct-billing package invoice gate runtime depends on new `CoursePackage.financeGate*` columns and the `PackageInvoiceApproval` table, so deploy order must keep DB schema and runtime aligned.
- Ops-flow risk: `2026-04-21-r86` removes the remaining finance-gate bypass paths, so any direct-billing chargeable package still waiting for manager invoice approval will now fail scheduling consistently until package billing is fixed.
- Export-layout risk: parent statement PDFs previously let the bilingual header title collide with the company/date block when the title wrapped; `2026-04-23-r87` removes that overlap without changing statement data.
- Contract-flow risk: `2026-04-23-r88` adds new public token pages, contract PDF generation, and `/uploads/contracts/*` storage, so deploy order must keep the migration and runtime aligned.
- Contract-layout risk: early `2026-04-23-r88` student contract downloads could let the bilingual title block and long summary values crowd each other; `2026-04-23-r89` tightens layout using measured text heights without changing contract logic.
- Partner-contract-ui risk: partner-settlement packages are exempt from the student contract flow, but some page-level shortcuts still looked like normal contract actions until `2026-04-23-r90` removes those misleading entry points.
- Contract-rework risk: `2026-04-23-r91` changes the direct-billing student contract journey from a simple draft/sign flow into a new-student intake path plus separate first-purchase and renewal modes, and it now auto-creates invoice drafts after signing, so deploy verification must cover student creation, both contract branches, and invoice dedupe.
- Student-type alias risk: `2026-04-23-r92` changes which student type the new parent-intake flow assigns for direct-billing students, so deploy verification must confirm new intake-created students now reuse the existing `自己学生-*` taxonomy and that legacy `直客学生` exports still render as direct-billing.
- Contract-history risk: `2026-04-23-r93` changes package billing to ignore void contracts when choosing the current active contract and adds physical deletion for unsigned/uninvoiced void drafts, so verification must confirm safe drafts can be removed while signed/invoiced void rows remain in collapsed history.
- Signature-submit risk: `2026-04-24-r102` changes how the public handwritten-signature pad syncs its hidden payload while the parent is drawing, so verification should confirm a quick draw-and-submit no longer falsely triggers the “please draw the handwritten signature” error.
- Contract-workspace navigation risk: `2026-04-24-r103` moves the student-contract workflow off the package billing page into a dedicated package contract page, so verification should confirm staff can still reach every contract action from the new page and that billing now feels lighter.
- Invoice-delete sequencing risk: `2026-04-24-r111` stops compacting later draft invoice numbers after deletion, so verification must confirm middle gaps remain visible, tail gaps get reused only naturally by the next new draft, and deleted draft numbers appear in history for audit.
- Parent-intake cleanup risk: `2026-04-24-r112` adds deletion for unused parent-intake links, so verification must confirm only `zhaohongwei0880@gmail.com` sees the action and that any intake already submitted into a student/package/contract remains undeletable.
- Student mobile sticky risk: before `2026-04-25-r119`, the student detail workbench could remain a full-height sticky panel on phones because the sticky guard used a desktop minimum width. Verification should confirm the large workbench is downgraded and only the compact shortcut row stays sticky.
- Admin mobile layout risk: `2026-04-25-r120` adds shared mobile shrink guardrails for logged-in admin content, so verification should cover representative admin pages and confirm tables remain horizontally scrollable inside their own containers instead of forcing the whole page sideways.
- Parent-feedback workflow risk: `2026-04-25-r121` makes five parent-facing sections required for teacher after-class feedback, so teachers revising old feedback must reshape it into the new structure before resubmitting.
- Teacher-feedback language risk: `2026-04-25-r122` changes the teacher feedback template to English/Chinese headings and hints, so screenshots and training docs should stay aligned with the live form.

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

## 2026-04-25-r122 Ready

- Scope: make the required parent-facing teacher feedback template bilingual for English-first teachers.
- Business impact:
  - 老师会看到 `Lesson focus / 本节课重点` 这类中英文对照标题
  - 每个反馈段落下方都有 `Hint / 提示`，英文老师可以直接按英文提示作答
  - 系统仍然接受英文标题、中英文标题、或旧中文标题，避免旧反馈被突然卡死
  - 不改变点名、工资、反馈转发队列、数据库结构或家长反馈业务逻辑
- Validation:
  - tested empty bilingual template returns all five missing sections
  - tested English-filled and Chinese-filled feedback both pass section validation
  - verified a real teacher session page renders the bilingual template
  - refreshed SOP screenshot `docs/assets/teacher-sop-20260425/04-parent-feedback-form.png`
  - `npm run build`
  - task doc: `docs/tasks/TASK-20260425-teacher-feedback-bilingual-prompts.md`

## 2026-04-25-r121 Ready

- Scope: change teacher after-class feedback from a teacher-side lesson log into a parent-facing progress note structure.
- Business impact:
  - 老师提交课后反馈时必须写清 `本节课重点`、`目前发现`、`课堂表现`、`下一步计划`、`家长需要知道`
  - 家长收到的反馈会更像“老师理解我孩子当前问题和训练路径”，而不是只看到今天讲了什么知识点
  - 作业和旧作业完成情况仍保留在原有字段里
  - 不改变点名、工资、超时反馈队列、转发状态或数据库结构
- Validation:
  - inspected recent real `SessionFeedback` examples
  - tested complete and incomplete parent-facing samples with the shared formatter
  - `npm run build`
  - task doc: `docs/tasks/TASK-20260425-parent-facing-teacher-feedback.md`

## 2026-04-25-r120 Ready

- Scope: improve logged-in admin mobile layout globally and fix the remaining teacher payroll mobile overflow.
- Business impact:
  - logged-in admin pages now keep common grid/flex content inside the phone viewport instead of creating page-level sideways scrolling
  - teacher payroll's work queue and selected payroll panel now collapse to one column on phones
  - wide tables can still scroll horizontally inside their own table area, but the full page should not drift sideways
  - no student, scheduling, finance, payroll, approval, or attachment records are changed
- Validation:
  - queried real admin, student, package, teacher, and ticket records for route coverage
  - local Playwright mobile viewport `390x844`
  - verified 17 logged-in admin routes with `overflowX=0` and no oversized sticky/fixed panels
  - verified mobile admin menu opens with `overflowX=0`
  - `npm run build`
  - task doc: `docs/tasks/TASK-20260425-admin-mobile-post-login-layout-sweep.md`

## 2026-04-25-r119 Ready

- Scope: stop the phone-width student detail workbench from sticking over the page while preserving a small jump row.
- Business impact:
  - 教务在手机端打开学生详情时，不会再被 `Student workbench / 学生工作台` 大块固定遮住正文
  - 手机端仍保留 `Jump / 跳转` 快捷入口，但它变成约一行高并支持横向滑动
  - 学生资料、排课、点名、课包、合同、财务逻辑都没有变化
- Validation:
  - `npm run build`
  - local Playwright mobile viewport `390x844` on real student `王艺晨`
  - verify `#student-workbench-bar` is downgraded to `position: static`
  - verify compact sticky shortcut row height is `56px` and uses horizontal overflow
  - verify scroll content remains visible below the compact row
  - task doc: `docs/tasks/TASK-20260425-student-mobile-sticky-workbench-fix.md`

## 2026-04-24-r111 Ready

- Scope: stop renumbering later draft invoices after deletions and surface deleted-draft history in both parent and partner billing views.
- Business impact:
  - deleting a middle draft invoice no longer rewrites later invoice numbers to close that gap
  - deleting the current month-end tail draft still lets the next new draft reuse that tail slot naturally because new numbering now follows the highest surviving monthly sequence
  - package billing and package contract pages now show deleted parent invoice draft history so finance can see exactly which number was removed
  - partner settlement billing now shows deleted partner invoice draft history on the invoices tab
  - no receipt numbering, approval logic, package balances, or finance-gate rules changed
- Validation:
  - `npm run build`
  - confirm delete actions no longer call monthly resequencing
  - confirm middle-gap deletes leave later invoices unchanged
  - confirm deleting the current tail draft lets the next new invoice reuse that tail slot naturally
  - confirm deleted draft histories render in package billing, package contract, and partner billing

## 2026-04-24-r112 Ready

- Scope: allow only `zhao hongwei` to delete mistaken unused parent-intake links from the student list without touching any already-submitted or downstream-linked intake records.
- Business impact:
  - mistaken intake links that never created a student can now be removed directly from `/admin/students`
  - only the owner account `zhaohongwei0880@gmail.com` sees the delete action
  - once a link has been submitted or linked to a student/package/contract, it stays in history and cannot be deleted
  - used parent-intake rows no longer crowd the main active list because they are collapsed under `Used link history / 已使用链接历史`
  - no student creation, contract flow, invoice flow, or partner logic changed
- Validation:
  - `npm run build`
  - verify owner account sees `Delete link / 删除链接` only on unused rows
  - verify non-owner accounts do not see the action
  - verify submitted rows stay visible but undeletable
  - verify submitted rows render under the history section instead of the main active queue

## 2026-04-23-r92 Ready

- Scope: stop splitting direct-billing students across `直客学生` and `自己学生-*` by making the new parent-intake flow reuse the existing `自己学生-*` taxonomy and by treating both names as direct-billing in outward-facing exports.
- Business impact:
  - new students created through the parent-intake link now prefer `自己学生-新生`, then any existing `自己学生-*` type, instead of always creating/using `直客学生`
  - this prevents the admin student list from continuing to split direct-billing students into two separate type buckets over time
  - existing legacy `直客学生` records are still treated as direct-billing in the student detail, student schedule, and package ledger PDF exports, so outward-facing branding stays consistent
  - no partner-settlement routing, contract logic, invoice creation, receipt flow, finance gate, or scheduling rule changed
- Validation:
  - query current `StudentType` records and confirm the real environment contains both `直客学生` and `自己学生-*`
  - create a fresh parent intake and confirm the submitted student is assigned to `自己学生-新生`
  - `npm run build`
  - verify direct-billing export helpers now recognize both `自己学生-*` and `直客学生`

## 2026-04-23-r93 Ready

- Scope: allow deletion of disposable void contract drafts and move void contracts into collapsed history so package billing stays focused on the current usable contract flow.
- Business impact:
  - void drafts that were never signed and never generated an invoice can now be deleted from package billing instead of accumulating forever
  - signed or invoiced void contracts stay preserved in collapsed history for audit and renewal-reference safety
  - package billing now ignores void contracts when deciding whether there is a current active contract, so an old void row no longer blocks staff from starting the next first-purchase or renewal contract
  - renewal contracts follow the same cleanup rule: only unsigned/uninvoiced void drafts are deletable
- Validation:
  - `npm run build`
  - create, void, and delete a direct-billing contract draft; confirm the package returns to a normal create-contract state
  - confirm signed or invoiced void contracts stay in `Void history / 作废历史` and do not show the delete action

## 2026-04-24-r102 Ready

- Scope: fix the public contract sign pad so the hidden signature payload is updated synchronously while the parent is drawing, preventing false “please draw the handwritten signature” errors after an immediate submit.
- Business impact:
  - parents can now draw and submit in one pass without being bounced back as if no handwritten signature was provided
  - the sign page still blocks true empty-signature submits, and clearing the signature still removes the payload
  - no contract-status rules, invoice creation behavior, signed PDF content, partner exclusions, or package balances changed
- Validation:
  - `npm run build`
  - verify drawing a signature and immediately clicking `Sign contract` succeeds
  - verify clearing the signature still empties the hidden form value and prevents submit until the parent signs again

## 2026-04-24-r103 Ready

- Scope: move the heavy student-contract workflow into `/admin/packages/[id]/contract` and leave a smaller contract summary + entry point inside package billing.
- Business impact:
  - package billing now stays focused on invoice and receipt work instead of carrying the full contract workspace inline
  - contract drafting, parent links, signed history, replacement versions, and void-history cleanup now live on a dedicated package contract page
  - partner-settlement packages still do not enter the student-contract workflow
  - no contract-state rules, invoice generation logic, signed-PDF content, or renewal hour top-up behavior changed
- Validation:
  - `npm run build`
  - verify package billing shows a compact contract summary and `Open contract workspace`
  - verify `/admin/packages/[id]/contract` exposes the same contract actions that previously lived inline on billing

## 2026-04-23-r87 Ready

- Scope: fix the top-right header layout in exported parent statement PDFs so wrapped bilingual titles no longer overlap company and generated-date text.
- Business impact:
  - parent statement downloads no longer show the `Statement of Account / 对账单` title colliding with the company name and generated date
  - the header now measures the actual title height before placing the next two lines, so the layout remains stable even if the title wraps
  - statement numbers, periods, student/package data, balances, and all finance figures remain unchanged
- Validation:
  - `npm run build`
  - export a parent statement PDF and confirm the top-right header block renders without overlap

## 2026-04-23-r88 Ready

- Scope: add the first direct-billing student contract flow with package-billing draft creation, parent intake, formal signing, and signed PDF export.
- Business impact:
  - package billing now exposes a `Contract flow / 合同流程` section where ops can create a contract draft, send the parent intake link, resend the formal sign link, void an open contract, preview the current draft PDF, and download the signed PDF once complete
  - student detail now shows the latest contract status on each package card and links back to the contract section in package billing
  - parent public link `/contract-intake/[token]` now collects parent details first and freezes them into a contract snapshot before formal signing
  - parent public link `/contract/[token]` now serves the formal agreement, accepts typed-name signing, and writes a signed PDF into business storage even when no handwritten signature image is provided
  - signed contract PDFs are now exportable from `/api/exports/student-contract/[id]`
  - no partner-settlement flows, invoice/receipt rules, finance gates, scheduling gates, or package balances changed
- Validation:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
  - library-level QA confirmed `create draft -> intake submit -> sign -> signed PDF saved`

## 2026-04-23-r91 Ready

- Scope: rework direct-billing student contracts so new students can start from a parent intake link, first purchases use ops-side package setup before formal signing, renewals skip intake, and signing auto-creates the matching invoice draft.
- Business impact:
  - admin students now exposes `Parent intake links / 家长资料链接`, so ops can send a collection link before a student exists in SGT
  - the new public route `/student-intake/[token]` creates the student record automatically after the parent submits the intake form
  - student detail now exposes a `First purchase setup / 首购建档` card after intake submission, where ops completes course, hours, fee, bill-to name, agreement date, lesson mode, and campus before the formal contract is generated
  - package billing now starts renewals with `Create renewal contract / 创建续费合同` and starts first-purchase signing only after the parent-intake/student-creation step is finished
  - the intake page now collects only parent profile details and no longer asks parents to confirm hours and fee figures directly
  - ops now completes the business-side contract draft in package billing or first-purchase setup, including hours, fee, bill-to name, and agreement date, before sending the final sign link
  - renewal contracts reuse the most recent stored parent profile, and the old intake link now clearly says `No intake needed / 无需填写资料`
  - signing a direct-billing contract now auto-links an existing single invoice when safe, or auto-creates a new parent invoice draft when no invoice exists yet
  - successful signing now lands on a clearer completion page that shows the linked invoice number directly
  - partner-settlement packages remain outside the contract flow and were not changed by this release
- Validation:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
  - local new-student QA: intake link -> parent submit -> student created -> first purchase setup -> sign -> invoice `RGT-202604-0017`
  - local renewal QA: reused parent info -> ready to sign -> sign -> invoice `RGT-202604-0018`
  - verify renewal package moves into `INVOICE_PENDING_MANAGER` after signing
  - cleanup QA script removed temporary student/intake/package/contract/approval/invoice records after validation

## 2026-04-23-r89 Ready

- Scope: fix the student contract PDF layout so the bilingual header and long summary values no longer overlap in downloaded contracts.
- Business impact:
  - downloaded student contracts now place `Tuition Agreement / 学费协议`, brand name, and legal company line based on actual measured text height instead of hard-coded offsets
  - long student names, long course names, and package summary values now wrap inside the summary box without colliding with neighboring columns
  - the agreement-date line now sits below the tallest summary value instead of assuming a fixed one-line layout
  - no contract statuses, contract links, signing behavior, billing flow, package logic, or finance gates changed
- Validation:
  - `npm run build`
  - generate a real student contract PDF and confirm the header/company lines no longer overlap
  - confirm long student/course/package content no longer overlaps inside the summary box

## 2026-04-23-r90 Ready

- Scope: remove misleading student-contract entry points from partner-settlement packages.
- Business impact:
  - partner-settlement packages no longer show `Create contract draft` inside package billing
  - student detail no longer tells ops to create a contract for partner-settlement packages from package billing
  - both pages now explain clearly that partner-settlement packages stay outside the student contract workflow
  - no settlement data, contract data, finance-gate state, billing logic, or scheduling logic changed
- Validation:
  - `npm run build`
  - verify a partner-settlement package shows the exempt explanation instead of contract creation actions

## 2026-04-21-r84 Ready

- Scope: add a finance reconciliation workbook export for all packages created since the system went live.
- Business impact:
  - finance now has one workbook that joins package master data with invoice detail, receipt detail, and uploaded payment-proof detail instead of pulling separate partial reports
  - the workbook uses the same package amount-basis priority already used elsewhere: purchase transactions first, then receipts, then package paid amount
  - an exception sheet now highlights common mismatch patterns such as uninvoiced package value, invoices not fully receipted, proofs without receipts, receipts without invoices, and inactive packages with open gaps
  - finance users can download the workbook directly from both the finance workbench and the student package invoice page
  - no package balances, invoice creation rules, receipt numbering, approval logic, or scheduling logic changed
- Validation:
  - `npm run build`
  - verify `/api/exports/package-finance-reconciliation` appears in the compiled route list
  - verify finance workbench and student package invoice pages now show the export entry point
  - post-deploy: verify the workbook downloads successfully and that all four sheets are populated when production data exists

## 2026-04-21-r85 Ready

- Scope: ship Phase 1 and Phase 2 of the direct-billing package invoice gate for direct-billing chargeable packages only.
- Business impact:
  - creating a new direct-billing chargeable package now auto-creates a parent invoice draft and a manager approval item instead of letting finance follow-up stay completely manual
  - those packages enter `INVOICE_PENDING_MANAGER` first and are not treated as normally schedulable until manager approval completes
  - package list, package billing, student detail, finance workbench, and approval inbox now surface the invoice gate state so ops, finance, and managers see the same status
  - the main scheduling entry points now soft-block on `PACKAGE_FINANCE_GATE_BLOCKED` and point users to package billing as the next action
  - strict super admins can still bypass finance-gate blocks during this soft-block phase, but no one can bypass a true “no active package” condition
  - partner-settlement packages remain excluded from this workflow and stay `EXEMPT`
  - receipt remains a finance follow-up control, not the first scheduling gate
- Validation:
  - `npx prisma migrate deploy` for `20260421183000_add_package_invoice_gate_phase1`
  - verify the new `CoursePackage.financeGate*` columns and `PackageInvoiceApproval` table exist
  - `npm run build`
  - real-flow QA on a test direct-billing package: pending before manager approval, schedulable after approval
  - confirm partner-settlement package remains `EXEMPT`
  - post-deploy: smoke-test package create, package billing approval, quick schedule warning, and partner-package exemption

## 2026-04-21-r86 Ready

- Scope: turn the direct-billing package invoice gate into a true hard scheduling gate by removing the remaining finance-gate bypass paths.
- Business impact:
  - pending or blocked direct-billing chargeable packages can no longer slip through scheduling via strict-super-admin bypasses in the main scheduling APIs
  - quick schedule, enrollments, class session create/generate/reschedule, booking approval, teacher generate sessions, and ops execute now all honor the same hard finance gate
  - partner-settlement packages remain outside this workflow and continue to stay `EXEMPT`
  - receipt still remains a later finance-control step, not the first scheduling gate
  - package billing now clearly tells users that manager approval is required before scheduling can continue, rather than describing hard blocking as a future phase
- Validation:
  - `npm run build`
  - `npm run test:backend`
  - verify no remaining runtime scheduling path bypasses `PACKAGE_FINANCE_GATE_BLOCKED`
  - post-deploy: smoke-test a pending direct-billing package through quick schedule, enrollments, create/generate/reschedule, booking approval, teacher generate sessions, and ops execute

## 2026-04-17-r83 Ready

- Scope: tighten shared time-input sync and make quick-schedule conflict copy prioritize the student's own existing session before generic teacher/room blockers.
- Business impact:
  - `BlurTimeInput` now follows external value/default changes, so pages that programmatically reset or swap times no longer risk showing a stale hour/minute selection
  - student quick-schedule preview now tells ops first when the student already has a session in that slot, instead of making the slot look empty until a later refresh or a generic room/teacher blocker
  - the same student-session-first conflict wording now applies to both `/api/admin/students/[id]/quick-appointment` and `/api/admin/ops/execute`, so different scheduling entry points stop disagreeing about the primary reason
  - no teacher-availability rules, room-occupancy rules, package checks, repeat scheduling behavior, or database duplicate guards changed
- Validation:
  - `npx tsx --test tests/session-conflict.test.ts tests/availability-conflict.test.ts tests/admin-teacher-availability.test.ts tests/quick-schedule-execution.test.ts`
  - `npm run build`
  - verify Coco + Jasmine `2026-04-27 17:30-19:00` still exists in the database and now surfaces as the first conflict reason instead of looking like a fresh availability error

## 2026-04-17-r82 Ready

- Scope: harden the quick schedule modal so `Find Available Teachers / 查找可用老师` always refreshes the candidate snapshot instead of depending on a manual page reload.
- Business impact:
  - the Coco + Jasmine investigation confirmed the target lesson on `2026-04-27 17:30-19:00` already exists in the database, so this was not a broad regression in teacher, room, or package rules
  - quick schedule candidate lookup now explicitly refreshes server-rendered results after the user clicks `Find Available Teachers / 查找可用老师`
  - the student-detail section hash is still restored after that refresh, so ops stays anchored in the quick schedule area
  - no teacher-availability rules, room-conflict rules, duplicate-session rules, repeat scheduling rules, or package checks changed
- Validation:
  - `npm run build`
  - verify Coco + Jasmine `2026-04-27 17:30-19:00` already exists in the database
  - verify quick schedule candidate lookup refreshes without needing a manual full-page reload

## 2026-04-17-r81 Ready

- Scope: fix the shared scroll interception rule so same-path query+hash links can navigate normally instead of being trapped as pure anchor jumps.
- Business impact:
  - student detail calendar month navigation now loads the requested month normally when the link changes `month=...` and keeps `#calendar-tools`
  - pure same-page hash jumps still keep the fast in-page scroll behavior when pathname and search do not change
  - the student-detail month pager no longer needs a dedicated client-side workaround because the shared root cause is fixed centrally
  - no scheduling rules, calendar calculations, package logic, or approval logic changed
- Validation:
  - `npm run build`
  - verify student detail calendar visibly switches months when clicking `Prev Month / 上月` and `Next Month / 下月`
  - verify pure same-page hash jumps still scroll correctly

## 2026-04-17-r80 Ready

- Scope: fix the student-detail scheduling calendar month pager so prev/next month visibly reloads the correct month instead of only changing the URL.
- Business impact:
  - student detail calendar month navigation now performs a full page navigation for the month pager, so the rendered month always stays in sync with the query string
  - clicking `Prev Month / 上月` and `Next Month / 下月` still keeps the page anchored to `#calendar-tools`
  - server-side calendar month math and the existing routing structure stay unchanged
  - no scheduling rules, package logic, appointment creation logic, or attendance logic changed
- Validation:
  - `npm run build`
  - verify student detail calendar visibly switches months when clicking `Prev Month / 上月` and `Next Month / 下月`
  - verify the page remains anchored to `#calendar-tools` after each click

## 2026-04-16-r71 Ready

- Scope: fix the two real admin work-map anchor issues found during post-ship QA on partner settlement and conflicts.
- Business impact:
  - `Partner Settlement / 合作方结算中心` now gives the `Action queue / 待处理队列` anchor a top offset, so jumping from the work map no longer leaves the destination pressed under the sticky control strip
  - `Conflict Center / 冲突处理中心` now always renders a valid `#conflict-results` target, even when the current date range has zero conflicts, so the work-map jump never points into empty space
  - conflicts results anchor now also has top-offset spacing, making the jump land in a readable place instead of hugging the sticky controls
  - no settlement rules, conflict rules, scheduling logic, or resolution actions changed
- Validation:
  - `npm run build`
  - verify partner settlement work-map jump to `Action queue` lands visibly below the sticky bar
  - verify conflicts work-map jump to `Conflict cards` still lands on a valid target when there are zero conflicts in range

## 2026-04-16-r72 Ready

- Scope: fix the approval inbox narrow-width overflow found during the next real admin QA sweep.
- Business impact:
  - `Approval Inbox / 审批提醒中心` now uses tighter approval-row and header column minimum widths, so the page fits inside the admin content area even when the left sidebar is visible on narrower desktop windows
  - the manager-lane narrow view no longer cuts off the right side of the summary/table area or forces unnecessary horizontal overflow
  - neighboring high-frequency workbenches (`expense claims`, `receipts approvals`, `todos`, `tickets`) were rechecked at the same width and stayed stable
  - no approval counts, lane routing, queue membership, or approval logic changed
- Validation:
  - `npm run build`
  - verify `/admin/approvals?focus=manager` is overflow-free around `1024px` width with the sidebar visible
  - verify `expense-claims`, `receipts-approvals`, `todos`, and `tickets` still remain overflow-free at the same width

## 2026-04-16-r73 Ready

- Scope: add an admin-layout sticky guard so oversized work-map bars stop covering the content below them.
- Business impact:
  - the large wide admin work-map bars now automatically downgrade from sticky to normal flow blocks when they are tall enough to cover the content below
  - this fixes the student detail page complaint and the same pattern across the other main admin workbench pages without editing each workflow page separately
  - narrower intentional sticky elements such as split-view detail panes and table headers remain sticky
  - no approval rules, ticket logic, scheduling logic, attendance logic, teacher logic, package logic, or finance logic changed
- Validation:
  - `npm run build`
  - production-build browser check confirms the main affected admin pages no longer keep the large work-map bar sticky
  - confirm the right-side detail pane on expense claims still remains sticky

## 2026-04-16-r74 Ready

- Scope: turn downgraded oversized admin work maps into compact sticky shortcut strips.
- Business impact:
  - the original large work map stays visible in normal flow, so the page keeps its full explanatory section
  - a new thin sticky shortcut strip now appears for downgraded work maps, preserving quick navigation without covering the content below
  - student detail, ticket center, expense claims, and similar workbench pages now keep a more usable sticky affordance instead of losing sticky behavior entirely
  - narrow intentional sticky panes, such as the expense-claims right detail pane, remain sticky
  - no approval, ticket, scheduling, attendance, teacher, package, or finance logic changed
- Validation:
  - `npm run build`
  - production-build browser check confirms compact sticky shortcut strips appear on representative downgraded work-map pages
  - confirm the expense-claims detail pane still stays sticky

## 2026-04-16-r70 Ready

- Scope: finish the next admin UX consistency pass on packages, partner settlement, teacher payroll, and conflicts.
- Business impact:
  - packages now preserve list context better with scroll memory, show clearer shared risk/status chips, and use the shared action-banner pattern for resumed filters, next-step guidance, and empty states
  - partner settlement now keeps scroll position, resumes remembered workbench context more clearly, and replaces several ad-hoc result blocks with shared action banners so finance sees more consistent next-step guidance
  - teacher payroll now remembers the last desk filters on normal return, clears through an explicit default-desk path, and uses shared banners plus shared workflow chips in queue/detail/table areas instead of mixed plain text badges
  - conflicts now remembers the last filter/date range on normal return, clears cleanly through a reset path, preserves scroll position, and uses shared chips/banners for conflict tags and empty results
  - no payroll rules, settlement rules, package rules, scheduling rules, or conflict-resolution business logic changed
- Validation:
  - `npm run build`
  - verify packages/partner-settlement/teacher-payroll/conflicts all keep or clear remembered context only when expected
  - verify the new shared banners appear for resumed state, success/failure feedback, and empty states on those four pages
  - verify payroll workflow state and conflict tags still reflect the same underlying data after the UI refactor

## 2026-04-16-r68 Ready

- Scope: finish the current admin workbench UI consistency pass and fix same-page anchor scrolling inside the admin scroll container.
- Business impact:
  - high-frequency admin workbenches now use a shared result banner pattern for success, failure, resumed context, and “next step” guidance instead of each page inventing its own feedback block
  - approvals, todos, tickets, expense claims, feedback desk, and receipts approval now share a more consistent sticky work-map treatment, so users can keep context while moving through long pages
  - the admin ticket center now also remembers scroll position, reducing the “back to top” problem when reopening the list after actions
  - same-page work-map anchors inside the admin app now scroll the actual `.app-main` container instead of only changing the hash, which fixes the “clicked jump link but nothing moved” problem on long pages
  - key anchor targets now include top offset spacing so sticky bars do not cover the destination heading after jump navigation
  - local narrow-width QA confirmed the main admin queue pages no longer show obvious horizontal overflow in the tested layouts
  - no approval rules, finance rules, receipt rules, ticket rules, scheduling rules, or feedback business logic changed
- Validation:
  - `npm run build`
  - local browser QA on `/admin/approvals`, `/admin/todos`, `/admin/tickets`, `/admin/expense-claims`, `/admin/feedbacks`, and `/admin/receipts-approvals`
  - verify work-map anchor links now move to the target section inside the admin scroll container
  - verify the main tested pages do not show obvious horizontal overflow at narrow widths
  - verify shared result banners appear on approvals/todos/tickets/expense/feedback/receipt workbenches where applicable

## 2026-04-16-r69 Ready

- Scope: add the second layer of admin UX consistency improvements for remembered desks, shared status chips, clearer form sections, and steadier split workbenches.
- Business impact:
  - tickets, teachers, and classes now remember their desk filters more consistently, while explicit `Back to default desk` actions clear that remembered state instead of trapping users in stale filters
  - students now also remember scroll position, reducing rescanning when returning to the list
  - approvals, tickets, and receipts now use clearer shared status chips, which makes state, risk, and queue information faster to compare across pages
  - expense claims now uses a shared split-view pattern for the review and finance workbenches, making the right-side detail area feel steadier while working through longer left-side queues
  - ticket support links are slightly de-cluttered so the main action path is clearer and secondary reference links are easier to ignore unless needed
  - no approval logic, finance rules, receipt logic, scheduling rules, or ticket business rules changed
- Validation:
  - `npm run build`
  - verify ticket, teacher, and class desks resume remembered filters only on normal return and clear properly through the default-desk links
  - verify approvals/tickets/receipts show the shared status-chip treatment
  - verify expense claims split panes remain stable while moving through queue items
  - verify students list now preserves scroll position on return

## 2026-04-15-r66 Ready

- Scope: polish approval inbox and receipt approval UX after finance-only receipt approval.
- Business impact:
  - Approval Inbox rows stack more cleanly on narrow screens instead of forcing a desktop table layout
  - receipt detail now explicitly explains legacy manager entries as audit history only
  - super-admin direct correction copy now says it updates the selected parent receipt, avoiding confusion on rejected receipts
  - unused receipt manager approve/reject page actions were removed from the receipt approval page; receipt approval remains finance-only
  - teacher payroll, partner settlement, and expense manager approval workflows remain unchanged
- Validation:
  - `npm run build`
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `/admin/approvals` should still show teacher payroll manager/finance reminders and expense reminders
  - `/admin/receipts-approvals/queue` should still show finance-only receipt state and explain legacy manager entries when present

## 2026-04-16-r67 Ready

- Scope: unify teacher feedback deadline timing and explain the late rule more clearly on teacher pages.
- Business impact:
  - teacher session detail now shows the exact time when late starts, instead of only a generic overdue warning
  - teacher feedback save success now tells the teacher whether that submission still counts as on time or is already late
  - teacher session list, teacher submit API, admin alerts, admin feedback overdue queue, and proxy/manual admin feedback flows now all use the same shared 12-hour deadline helper
  - the actual rule did not change: after-class feedback still becomes late only 12 hours after class end
- Validation:
  - `npx tsx --test tests/feedback-timing.test.ts`
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npm run build`
  - teacher session detail should clearly show `请在 ... 前提交；超过这个时间才算迟交`
  - teacher feedback submit success should clearly show whether the submission is on time or late
  - admin alerts and admin feedback overdue handling should still follow the same 12-hour cutoff

## 2026-04-15-r65 Ready

- Scope: simplify parent and partner receipt approval to finance-only approval.
- Business impact:
  - receipt reminders still appear in Approval Inbox, but only in the finance lane
  - finance can approve parent and partner receipts without waiting for manager approval
  - formal receipt PDFs, parent statements, finance workbench, package billing, partner billing, history export, and invoice resequencing now treat finance approval as the receipt completion gate
  - legacy manager receipt approval/rejection data is preserved as audit history, but it is no longer part of the active receipt flow
- Validation:
  - `npm run build`
  - newly generated receipts should show as `Needs finance / 待财务审批`, not `Needs manager / 待管理审批`
  - finance approval should unlock receipt PDF export
  - teacher payroll, partner settlement, and expense approval manager flows should remain unchanged

## 2026-04-15-r64 Ready

- Scope: add teacher payroll approval reminders into the unified Approval Inbox.
- Business impact:
  - management can now see teacher payroll records that teachers have confirmed but managers have not fully approved
  - finance can now see teacher payroll records that are manager-approved but still need finance confirmation or payout recording
  - payroll approval rows open the existing Teacher Payroll page with the teacher focused and a return banner back to Approval Inbox
- Validation:
  - `npm run build`
  - teacher-confirmed payroll awaiting management approval should appear under `Needs manager / 待管理审批`
  - manager-approved payroll awaiting finance confirmation or payout recording should appear under `Needs finance / 待财务审批`
  - teacher payroll calculations and approval server actions should remain unchanged

## 2026-04-11-r40 Ready

- Scope: let one active parent-availability link open a same-student multi-course page while still keeping each course on its own coordination ticket, submission payload, and helper lane.
- Business impact:
  - the public `/availability/[token]` page can now show multiple active course cards for the same student, and each course submits independently
  - student detail now treats coordination as course-separated lanes, so ops can switch the helper panel between open tickets and create a new coordination ticket only for courses not already being tracked
  - intake reuse is now course-aware, so an incoming coordination request will reuse the matching course lane instead of always reusing the first open coordination ticket for that student
- Validation:
  - `npm run build`
  - one valid parent link should render all same-student active coordination course cards on the same page
  - each course card should keep its own payload and success state
  - student detail should switch helper focus by selected coordination ticket
  - intake should only reuse the matching course coordination lane

## 2026-04-12-r41 Ready

- Scope: fix scheduling-coordination helper state after post-confirmation parent re-submissions and search candidate slots inside the parent-submitted availability window before filtering.
- Business impact:
  - a coordination ticket that was already confirmed will now show a manual-review state if the parent later submits new availability, instead of still looking immediately ready to schedule
  - helper candidate generation now searches the parent-submitted availability window first, so it is less likely to miss viable parent-matching times just because the initial teacher slot slice was too small
  - suggested duration now prefers the coordination ticket's stored duration before falling back to historical session samples or the old `45` minute default
- Validation:
  - `npm run build`
  - post-confirmation parent re-submissions should show `Manual review needed / 需人工复核` on student detail, ticket detail, and todo cards
  - helper candidate generation should prefer parent-window matches when they exist
  - suggested duration should use `ticket.durationMin` first when available

## 2026-04-12-r42 Ready

- Scope: rebalance calendar-mode coordination helper shortlists so the first few visible matches cover more of the parent's selected dates.
- Business impact:
  - helper candidate generation still uses the same parent-time matching rules, but now the first shortlist is less likely to be dominated by the earliest matching date
  - ops can see more date coverage immediately when a parent selected several calendar dates and multiple dates already have real availability matches
  - dates with no real matches still stay absent, so this improves visibility without weakening the filtering rules
- Validation:
  - `npm run build`
  - calendar-mode helper shortlists should try to include more unique parent-selected dates before repeating the same date
  - the example ticket `20260409-004` should now show `2026-04-11`, `2026-04-13`, `2026-04-19`, and `2026-04-20` inside the first five generated options

## 2026-04-12-r43 Ready

- Scope: move the full scheduling-coordination workspace off the crowded student detail page and into a dedicated student coordination page.
- Business impact:
  - the main student detail page becomes shorter and easier to scan because it keeps only a coordination summary card
  - a dedicated `/admin/students/[id]/coordination` page now carries the full coordination workspace, including helper tools and ticket switching
  - coordination-related entry points and returns now land on the dedicated coordination page instead of sending ops back into the long main detail page
- Validation:
  - `npm run build`
  - main student detail should show only the lighter coordination summary card
  - the dedicated coordination page should load the same coordination workspace and actions
  - coordination helper actions and ticket back-links should return to the dedicated coordination page

## 2026-04-12-r44 Ready

- Scope: add a clear close/return action inside the dedicated student coordination page so ops can leave the workspace in one click.
- Business impact:
  - the dedicated `/admin/students/[id]/coordination` page now shows an explicit `Close coordination workspace / 关闭排课协调工作台` action instead of making users infer that they should use browser navigation
  - the student workbench also changes its first link to the same close action when the user is already inside the dedicated coordination workspace
  - returning to the main student detail page no longer feels like getting trapped in a one-way workspace
- Validation:
  - `npm run build`
  - the dedicated coordination page should show a visible close action in both the workbench links and the page header
  - clicking the close action should return to the main student detail page
  - the main student detail page should still show the normal `Scheduling coordination / 排课协调` entry when not inside the dedicated workspace

## 2026-04-13-r45 Ready

- Scope: support parent-side partial payments by allowing multiple receipts on the same invoice, with remaining-balance-aware create-receipt defaults and a dedicated partial-receipt status in finance workbench.
- Business impact:
  - parent invoices can now keep using the same invoice for split payments instead of being blocked after the first receipt
  - the first receipt stays `InvoiceNo-RC`, and later receipts become `InvoiceNo-RC2`, `InvoiceNo-RC3`, etc.
  - the receipt creation page now shows how much has already been receipted and how much remains, and defaults the next receipt to the remaining amount

## 2026-04-13-r46 Ready

- Scope: make parent partial-receipt progress more legible across finance-facing package billing, statement export, and receipt-history export views.
- Business impact:
  - package billing now shows invoice-level receipt counts, created/approved/pending amounts, and remaining balance, so finance can tell at a glance whether an invoice is still waiting for another receipt
  - each receipt row in package billing now echoes the linked invoice's overall receipt progress, reducing the need to switch back to the create-receipt view just to understand the remaining balance
  - statement export and receipt-history CSV now include invoice-level receipt progress so partial receipts are easier to reconcile outside the live app
- Validation:
  - `npm run build`
  - `/admin/packages/[id]/billing` should show invoice-level receipt progress and next-receipt action links
  - `/api/exports/parent-statement/[id]` should include an invoice receipt breakdown section
  - `/admin/receipts-approvals/history/export` should include invoice-level total/receipted/pending/remaining fields for parent receipts

## 2026-04-13-r47 Ready

- Scope: streamline the next parent receipt create flow by preloading the recommended invoice/proof pair and making the next receipt number visible before submit.
- Business impact:
  - package finance workspace now shows a recommended next-receipt card with invoice number, next receipt number, remaining amount, and suggested proof
  - when only one usable unlinked payment proof exists, the create flow now auto-selects it and explains that choice
  - package-level `Create the next receipt` shortcuts now jump into a ready-to-create view instead of a generic create step
  - invoice pickers now display the next expected receipt number, helping finance confirm whether they are creating `-RC`, `-RC2`, or later
- Validation:
  - `npm run build`
  - package finance workspace should show the recommended next-receipt helper card
  - package next-step CTA should carry the recommended invoice and proof into the create step
  - create-step invoice dropdowns should show the next receipt number for each invoice

## 2026-04-13-r48 Ready

- Scope: fix the backend receipt-number validator for parent multi-receipt flows and lock the feature down with focused automated tests.
- Business impact:
  - parent multi-receipt flows no longer depend on the old single-receipt regex in the store layer, so `-RC2`, `-RC3`, and later receipt numbers are accepted correctly
  - automated coverage now protects the main edge cases for partial receipts: numbering progression, second-receipt creation up to the remaining amount, over-receipt blocking, and duplicate payment-record rejection
  - this release reduces the chance of silently reintroducing the old `RC only` assumption in future finance changes
- Validation:
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npm run test:backend`
  - `npm run build`

## 2026-04-11-r39 Ready

- Scope: let the parent-availability exact-date mode collect multiple time ranges on a single selected day without changing the existing weekly template flow or payload schema.
- Business impact:
  - parents using `/availability/[token]` calendar-date mode can now add up to three time ranges for one selected date instead of being limited to one range
  - submissions still store the existing flat `dateSelections[]` structure, so repeated dates now represent multiple ranges on the same day
  - admin-side summaries group those repeated date entries into one clearer date line for ticket and student review
- Validation:
  - `npm run build`
  - calendar-date mode should allow adding and removing extra time ranges for a selected day
  - weekly template mode should continue behaving exactly as before
  - calendar-mode summary text should show one date followed by all submitted time ranges for that date

## 2026-04-11-r38 Ready

- Scope: add a second parent-availability collection mode so families can either submit a weekly repeating template or choose specific dates and times in a calendar-style grid.
- Business impact:
  - the public `/availability/[token]` page now supports both a weekly template mode and a specific-date mode without removing the original weekly flow
  - ticket detail and student detail summaries now show which mode the parent used and display exact-date picks when that mode was chosen
  - scheduling-coordination matching now respects exact-date submissions and expands the search window so later selected dates are not dropped before filtering
- Validation:
  - `npm run build`
  - parent form should switch cleanly between weekly and specific-date modes
  - weekly submissions should continue to behave as before
  - exact-date submissions should appear in admin summaries and affect matching previews correctly

## 2026-04-11-r37 Ready

- Scope: bring back a clear completion-note prompt before marking a ticket completed, while keeping the new anchored return behavior in ticket-center pages.
- Business impact:
  - list and detail status actions now prompt for the required completion note before submitting a `Completed` status change
  - cancelling the prompt or leaving it blank now stops submission locally, so operators keep their place instead of landing on a top-of-page error
  - server-side completion-note validation still stays in place as a safety guard
- Validation:
  - `npm run build`
  - selecting `Completed` without a note should open a prompt from both `/admin/tickets` and `/admin/tickets/[id]`
  - cancelling or leaving the prompt empty should keep the operator on the current row or section with no submit
  - entering a completion note in the prompt should submit successfully and keep the current anchored return behavior

## 2026-04-11-r36 Ready

- Scope: keep ticket-center actions anchored to the current work area so operators stay on the same ticket row or detail section after each server action.
- Business impact:
  - ticket-center list status saves now return to the same ticket row instead of the top of the page
  - ticket-center archive and permanent-delete actions now return to the ticket list section, including archived-ticket filters
  - ticket detail status, edit, and scheduling-coordination quick actions now return to the section the operator just used instead of the page top
- Validation:
  - `npm run build`
  - status saves from `/admin/tickets` should stay on the active row
  - detail-page status, edit, and coordination actions should stay on their section anchors
  - archived-ticket deletes should preserve filters and return to the archived list area

## 2026-04-11-r35 Ready

- Scope: let Zhao Hongwei permanently delete already-closed tickets from the ticket center while leaving the existing archive-first workflow in place for everyone else.
- Business impact:
  - completed or cancelled tickets in the main ticket center can now show a strict-super-admin-only `Delete permanently / 永久删除` action in addition to archive
  - archived tickets and ticket detail now expose the same permanent delete action only for Zhao Hongwei
  - open tickets still cannot be permanently deleted, and other admins keep the existing non-destructive archive flow
- Validation:
  - `npm run build`
  - Zhao Hongwei should see the permanent delete action on completed, cancelled, and archived tickets across ticket center surfaces
  - non-Zhao users should not be able to use the permanent delete path
  - open tickets should continue rejecting permanent delete attempts

## 2026-04-11-r34 Ready

- Scope: make scheduling-coordination ticket reuse read consistently in the intake success state so operators are told when the current open ticket was reused rather than being told a new one was created.
- Business impact:
  - external intake already reuses the current open scheduling-coordination ticket for the same student; the success card now explains that reuse clearly when an active parent link is still available
  - newly created scheduling-coordination tickets keep the existing "created" success wording, so operators can still tell the difference between a new ticket and a reused one
  - no ticket selection rules, parent-link generation, parent submission storage, scheduling execution, session, package, or finance logic changed
- Validation:
  - `npm run build`
  - intake QA should confirm the top success message still says `已沿用当前排课协调工单 / Reused current coordination ticket` when an open ticket is reused
  - intake QA should confirm the green parent-link card now also says the current ticket was reused instead of saying the ticket was created
  - intake QA should confirm genuinely new scheduling-coordination tickets still show the existing "ticket created" wording

## 2026-04-08-r07 Deployed

- Scope: change online partner settlement from whole-package snapshot batching to purchase-batch settlement, with explicit item selection, revert-to-queue behavior, and start/end dates on settlement exports.
- Business impact:
  - `/admin/reports/partner-settlement` now shows online settlement candidates per `PackageTxn(PURCHASE)` tranche instead of collapsing multiple purchases into one package row
  - each online row now includes purchase date, start date, end date, hours, and amount so finance can settle one purchased batch at a time
  - online billing no longer auto-bundles every pending row; operators must choose the specific settlement items to invoice
  - reverting an online settlement no longer deletes it permanently; the tranche can return to the queue for re-billing
  - partner invoice export now includes `Course Start / Course End` when selected online settlement items provide that date window
  - offline monthly settlement remains unchanged
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - operator QA should confirm online partner-settlement rows are split by purchase batch and that billing only invoices explicitly selected rows

## 2026-04-09-r04 Deployed

- Scope: let Emily-style external intake operators create `Scheduling Coordination / 排课协调` tickets and immediately generate a temporary parent availability link that feeds back into the coordination workflow.
- Business impact:
  - intake submitters can now create coordination tickets without entering the admin system and receive a copyable family link right after submission
  - each coordination ticket now has at most one active parent availability request with expiry and submission status
  - parents can submit structured weekday/time preferences through a public `/availability/[token]` page without implying auto-scheduling
  - submitted parent availability now flows into the linked ticket, student detail scheduling card, and `Todo Center`
  - no scheduling execution, attendance, package, or finance logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - intake QA should confirm `Scheduling Coordination / 排课协调` returns a copyable parent link after submit
  - parent-form QA should confirm `/availability/[token]` stores a structured submission and that operators can see it from admin ticket detail, student detail, and `Todo Center`

## 2026-04-09-r05 Deployed

- Scope: fix the parent availability link origin returned by the external intake API so Emily receives a production `sgtmanage.com` link instead of a `localhost` URL.
- Business impact:
  - intake-created `Scheduling Coordination / 排课协调` tickets now return a copyable parent form link that points at the public production site
  - the parent availability token and storage flow remain unchanged; only the absolute origin selection is corrected
  - no ticket status logic, parent submission handling, scheduling coordination cards, availability matching, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - a real intake submission should now return `https://sgtmanage.com/availability/...` in the JSON payload

## 2026-04-09-r06 Deployed

- Scope: make the Emily intake success state and the parent availability form easier to use without changing the underlying coordination flow.
- Business impact:
  - after creating a `Scheduling Coordination / 排课协调` ticket, Emily now sees a clearer handoff panel with step-by-step guidance, a direct copy-link action, and a copyable bilingual parent-message snippet
  - the public `/availability/[token]` page now explains more clearly that it only collects available times rather than confirming a lesson schedule
  - the parent form now has friendlier section guidance and more touch-friendly inputs for date, time, and preference fields
  - no token creation, ticket status, parent-availability storage, scheduling coordination logic, quick schedule, attendance, package, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - Emily intake success state should show the new copy/send guidance
  - parent `/availability/[token]` should render the new helper panels and updated form inputs
  - `赵测试` real-flow QA should confirm the returned `parentAvailabilityUrl` uses the public `sgtmanage.com` host

## 2026-04-09-r09 Deployed

- Scope: make scheduling coordination feel more like a true operator state flow by adding a derived coordination phase, clearer next-step guidance, and one-click ticket progression for “options sent” and “teacher exception needed”.
- Business impact:
  - `/admin/tickets/[id]` now shows a coordination phase summary with clearer operator guidance based on live parent-submission and availability-match state
  - coordination operators can now move a ticket forward with one click using `Mark options sent / 标记已发候选时间` or `Ask teacher exception / 转老师例外确认`
  - `/admin/students/[id]` now mirrors the coordination phase summary so the student detail page shows the same state framing as the ticket console
  - `Todo Center` coordination cards now derive and display the same phase text when a live reminder row exists
  - no token handling, parent form storage, quick schedule execution, session creation, attendance, package, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = dea110a` and `https://sgtmanage.com/admin/login` returned `200`
  - live admin ticket detail for `赵测试` showed `Coordination phase / 协调阶段`, `Availability options ready / 候选时间已就绪`, and `Mark options sent / 标记已发候选时间`
  - live student detail for `赵测试` showed `Scheduling coordination / 排课协调` actions including `Open parent form`, `Copy link`, `Copy message`, and `Regenerate link`
  - `Todo Center` phase text was not re-verified against a live due coordination reminder because no qualifying row was available during this QA pass

## 2026-04-09-r10 Ready

- Scope: clarify the date-vs-weekly teacher availability inheritance so the UI no longer implies a teacher has no availability when scheduling is actually falling back to the weekly template.
- Business impact:
  - teacher monthly availability cells now explain when there is `No date override / 当天没有按日期覆盖` but the day is still schedulable through the weekly template
  - those cells now show `Weekly template still applies / 仍按每周模板可排` together with the inherited weekly time range, so ops can see why scheduling is allowed
  - quick schedule candidate rows now distinguish `按每周模板可排` from `按日期时段可排`, which makes the source of availability clear during manual scheduling
  - no actual availability rules, session creation behavior, conflict checks, package logic, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - teacher availability QA should confirm inherited weekly slots render inside monthly cells where there is no date override
  - quick schedule QA should confirm teacher candidate statuses now indicate whether availability came from the weekly template or from date-specific availability

## 2026-04-09-r11 Ready

- Scope: stop all real scheduling flows from falling back to weekly templates so the only schedulable source is date-based availability for the specific day.
- Business impact:
  - quick schedule, class session creation, rescheduling, teacher replacement, appointment creation, and ops execution now reject a time if that day has no date availability row, even when the teacher has a matching weekly template
  - booking candidate generation now only uses date availability rows within the requested range, so operators and families no longer see slots that come only from a weekly template
  - the admin teacher availability page now clearly says that real scheduling uses the month date rows and that weekly templates are only for generating those rows
  - weekly templates still remain available as a bulk month-generation tool; no schema or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - QA should confirm a date with no date availability cannot be quick-scheduled anymore
  - QA should confirm booking candidates disappear for days that only had weekly-template availability

## 2026-04-10-r12 Ready

- Scope: make the availability wording much more explicit for both teachers and ops so it is obvious which inputs control real scheduling.
- Business impact:
  - teacher `/teacher/availability` now clearly states that the saved date slots on that page are the real source used by ops scheduling
  - admin teacher availability page now labels the weekly area as a generation template and says the template itself is not direct scheduling availability
  - no scheduling rules, template generation logic, or permissions changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - teacher availability page should show the new blue guidance notice
  - admin teacher availability page should show the stronger weekly-template wording

## 2026-04-10-r13 Ready

- Scope: make the split finance receipt routes easier to operate by surfacing the next best queue item and adding clearer package-workspace step guidance.
- Business impact:
  - `/admin/receipts-approvals` queue-facing screens now show `Next best item / 下一条最该处理`, so finance can immediately see which receipt to clear next and why it is the best candidate
  - the new next-item card now explains whether the row is blocked by missing proof, missing file, prior rejection, or just needs a quick amount/detail check before approval
  - `/admin/receipts-approvals/package` now shows three step cards for `Upload`, `Check Records`, and `Create Receipt`, with `Done / Current / Next` states so finance can stay oriented while working one package
  - no receipt creation rules, invoice rules, approval requirements, package balances, settlement logic, or deduction behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - queue QA should confirm `Next best item / 下一条最该处理` appears whenever an actionable finance row exists
  - package-workspace QA should confirm the three step cards render with sensible `Done / Current / Next` states as package proof/receipt progress changes

## 2026-04-10-r14 Ready

- Scope: make receipt history easier to search and make proof-repair triage more obvious on the split finance routes.
- Business impact:
  - `/admin/receipts-approvals/history` now includes a dedicated search box that filters completed receipts and recent finance actions by student, course, receipt number, invoice number, or uploader
  - the history page now keeps the selected receipt aligned with the visible filtered results, so finance does not end up viewing a stale completed row after narrowing the search
  - `/admin/receipts-approvals/repairs` now shows two separate quick-triage panels for `Missing payment record / 缺付款记录` and `Missing file on linked proof / 已关联但缺文件`, so finance can immediately see whether a row needs proof linking or file re-upload
  - no receipt creation rules, invoice rules, approval requirements, package balances, settlement logic, or deduction behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - history QA should confirm search filters both the completed queue and `Recent Finance Actions`
  - repairs QA should confirm the two triage panels show the right counts and direct jump links for missing-record vs missing-file rows

## 2026-04-10-r15 Ready

- Scope: keep the finance sidebar stable while switching between the top receipt workflow tabs.
- Business impact:
  - the top `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History` tabs on `/admin/receipts-approvals*` now use client-side navigation instead of raw anchor reloads
  - switching those top tabs no longer forces a full page refresh, so the left finance sidebar keeps its current scroll position instead of jumping back to the top
  - no receipt creation rules, invoice rules, approval requirements, package balances, settlement logic, or deduction behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - QA should confirm the top receipt tabs switch pages without a full reload and the left sidebar stays in place

## 2026-04-10-r16 Ready

- Scope: keep the top finance receipt workflow tabs from auto-scrolling the page back to the top after the move to client-side navigation.
- Business impact:
  - the top `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History` tabs on `/admin/receipts-approvals*` now preserve the current page scroll position while switching modes
  - `Receipt Queue / 收据审批队列` now uses a stable dedicated queue route, so the finance sidebar keeps the same active queue item instead of visually changing when query-based resets fire
  - finance can continue reading or cross-checking mid-page without being thrown back to the top of the workspace after each tab click
  - no receipt creation rules, invoice rules, approval requirements, package balances, settlement logic, or deduction behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - QA should confirm the top receipt tabs still switch without a full reload and now also keep the main page scroll position stable
  - QA should confirm the finance sidebar still highlights `Receipt Queue / 收据审批队列` after reopening the queue from top tabs or dashboard shortcuts

## 2026-04-10-r17 Ready

- Scope: make the finance receipt queue easier to advance and give receipt history a clearer focus filter without changing finance business logic.
- Business impact:
  - `Next best item / 下一条最该处理` now includes a direct `Open next item / 打开下一条` action so finance can jump straight into the recommended row
  - `/admin/receipts-approvals/history` now supports `All history / 全部历史`, `Receipts only / 只看收据`, and `Actions only / 只看动作`, so finance can switch between lookup modes without wading through mixed content
  - the history page can also narrow `Recent Finance Actions / 最近财务动作` by action type such as payment upload, invoice creation, or receipt creation
  - no receipt creation rules, invoice rules, approval requirements, package balances, settlement logic, or deduction behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - QA should confirm `Next best item / 下一条最该处理` opens the recommended row in one click
  - QA should confirm the history page focus filter can hide receipts or recent actions independently
  - QA should confirm recent-action type filtering works on `/admin/receipts-approvals/history`

## 2026-04-09-r07 Deployed

- Scope: upgrade scheduling coordination from a basic summary into a more complete operator console with reusable parent-link actions, structured parent submission summaries, and copyable parent-message text from both tickets and student detail pages.
- Business impact:
  - `/admin/tickets/[id]` now shows a richer `Scheduling Coordination Console` with clear waiting-vs-submitted status, latest parent submission details, direct parent-form open/copy actions, and one-click link regeneration
  - `/admin/students/[id]` now mirrors those parent-link controls so ops can work from the student page without jumping back to the ticket center
  - generated availability candidate slots, exact-match special requests, and nearest alternatives now include `Copy Message` actions that produce ready-to-send parent wording
  - submitted parent availability is rendered as structured summary rows instead of a raw blob, making it easier for ops to scan the family constraints before scheduling
  - no ticket token model, quick schedule execution, session creation, attendance, package, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - admin `/admin/tickets/[id]` should show the new coordination console actions and latest parent summary
  - admin `/admin/students/[id]` should show matching parent-link actions and summary rows on the scheduling coordination card
  - `赵测试` style live QA should confirm slot cards expose `Copy Message` actions and parent-link regeneration returns a fresh public `/availability/...` URL

## 2026-04-09-r08 Deployed

- Scope: make the scheduling coordination operator console availability-aware by comparing the latest parent-submitted preferences against teacher availability and surfacing either direct matches or nearest alternatives inside the admin ticket detail page.
- Business impact:
  - `/admin/tickets/[id]` now shows `Availability-backed result / availability 命中结果` for submitted scheduling coordination tickets
  - if a parent submission already fits current teacher availability, ops can immediately copy and send those matching slot options from the ticket detail page
  - if no current availability matches the submission, the ticket detail page now shows the nearest alternative slots and copyable fallback wording instead of leaving ops to cross-check manually
  - `/admin/students/[id]` now narrows generated coordination slots against the submitted parent availability so the coordination card stays aligned with what the family actually said they can do
  - no ticket token, quick schedule, session, attendance, package, or finance behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - admin `/admin/tickets/[id]` should show `Availability-backed result` with either matching slot cards or alternative slot cards
  - student detail scheduling coordination card should only show generated slot cards that fit the submitted parent availability

## 2026-04-09-r09 Ready

- Scope: make scheduling coordination read more like a working queue by adding a derived coordination phase, clearer next-step guidance, and one-click progress actions for “options sent” and “teacher exception needed”.
- Business impact:
  - `/admin/tickets/[id]` now shows a derived `Coordination phase / 协调阶段` so ops can tell at a glance whether the item is still waiting for a parent submission, ready to send availability-backed options, waiting for the family to choose, or needs a teacher exception
  - ticket detail now includes one-click actions to move a coordination item to `Waiting Parent` after sending slot options or to `Waiting Teacher` when a true exception is needed
  - `/admin/students/[id]` now mirrors the derived coordination phase on the scheduling card so the student detail page no longer hides where the process is stuck
  - `/admin/todos` now shows the same phase wording on coordination follow-up rows and submitted-parent-availability rows
  - no token model, parent form storage, quick schedule execution, session creation, attendance, package, or finance behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - ticket detail QA should confirm the new phase card and quick progress actions render for scheduling coordination items
  - student detail QA should confirm the scheduling coordination card shows the derived phase text
  - `Todo Center` QA should confirm coordination rows show the phase text instead of only the raw status

## 2026-04-08-r02 Deployed

- Scope: add a first-pass `Teacher Lead / 老师主管` role as a teacher-side additive ACL with a new `Lead Desk / 主管工作台` focused on the all-teachers daily schedule.
- Business impact:
  - owner-manager edit mode under `System User Admin / 系统使用者管理` now includes `Teacher Lead Access List / 老师主管名单维护`
  - selected teacher-linked accounts can now see `Lead Desk / 主管工作台` inside the teacher portal
  - `/teacher/lead` shows a read-only all-teachers daily schedule with date, teacher, and campus filters
  - teacher leads do not gain finance approval, admin sidebar, system setup, student editing, or other admin-only powers
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - owner-manager QA should confirm teacher-lead ACL rows can be added/removed in `/admin/manager/users?mode=edit`
  - a teacher-lead account should see `Lead Desk / 主管工作台` in the teacher sidebar and load `/teacher/lead`

## 2026-04-08-r03 Deployed

- Scope: make the teacher-lead schedule page more visual by replacing the plain table-first view with a calendar-like hourly day board.
- Business impact:
  - `/teacher/lead` now opens with `Visual day board / 日历板视图` as the primary all-teachers schedule view
  - leads can scan the day hour by hour and see session cards grouped by start hour, with teacher, course, campus, and students visible on each card
  - the original detailed table is still available inside `Detailed schedule table / 详细排班表`
  - no ACL, filter, finance, or admin permission behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - teacher-lead QA should confirm `/teacher/lead` shows the new hourly board and still preserves the detailed table below

## 2026-04-08-r06 Deployed

- Scope: replace the teacher-lead month board with a one-week calendar that keeps every day's sessions directly expanded.
- Business impact:
  - `/teacher/lead` now focuses on the current week instead of the whole month, so the board is denser and easier to scan
  - each day cell shows all visible sessions directly, so leads no longer have to rely on `+more` folding
  - the selected-day details section and detailed table remain below for follow-up
  - no ACL, filter, finance, or admin permission behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - teacher-lead QA should confirm `/teacher/lead` shows one week only and each day cell expands all sessions directly

## 2026-04-08-r05 Deployed

- Scope: replace the teacher-column lead board with a month-calendar primary view.
- Business impact:
  - `/teacher/lead` now opens with a month-calendar board instead of teacher columns, so leads can scan the whole month without large empty lanes
  - clicking a day in the calendar updates the selected-day detail cards and the detailed table below
  - teacher and campus filters still work, but now affect the whole month view as well as the selected day
  - no ACL, filter, finance, or admin permission behavior changed
- Validation:
  - `npm run build`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned and `https://sgtmanage.com/admin/login` returned `200`
  - teacher-lead QA should confirm `/teacher/lead` shows the month calendar above and selected-day details below

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

## 2026-04-07-r05 Deployed

- Scope: soften the final-report PDF again so it reads as a parent-friendly growth reflection instead of a renewal prompt.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` now uses `Learning snapshot / 学习成长概览` and `Next learning focus / 下一阶段关注重点` wording instead of explicit renewal-oriented language
  - the recommendation narrative is now framed as a teacher observation about progress, remaining gaps, and the next area worth focusing on
  - no final-report data, assignment logic, delivery/share actions, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`

## 2026-04-07-r06 Deployed

- Scope: further soften the parent-facing final-report PDF so the section titles and summary row read more like a teacher reflection to the family.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` now uses softer family-facing labels such as `This stage in summary`, `Progress we observed`, and `Teacher note to family`
  - the top summary row now uses `Current growth focus / 当前成长重点` instead of a recommendation-style label
  - no final-report data, assignment logic, delivery/share actions, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`

## 2026-04-07-r07 Deployed

- Scope: remove the large empty lower-right area from the parent-facing final-report PDF by making the lower cards reflow to match the actual number of filled sections.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` no longer keeps a fixed 3-column lower grid when only one or two sections are filled
  - filled sections can now expand wider across the page, so sparse reports read more naturally and do not leave a large empty corner
  - no final-report data, wording intent, assignment logic, delivery/share actions, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`

## 2026-04-07-r08 Deployed

- Scope: remove the remaining duplicate feel in the parent-facing final-report PDF by not showing an extra `Next learning focus` body card when the teacher already wrote `Areas to keep strengthening`.
- Business impact:
  - `/api/admin/final-reports/[id]/pdf` still keeps the top summary-row growth focus, but no longer repeats a second body card with the same meaning when the teacher already filled the strengthening section
  - sparse reports stay cleaner and read more like one coherent family note rather than a form with repeated prompts
  - no final-report data, summary wording, assignment logic, delivery/share actions, attendance logic, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - admin final-report PDF route should continue returning `200` with `application/pdf`

## 2026-04-08-r08 Deployed

- Scope: let ops record HOURS package sales and top-ups as split purchase batches so partner settlement can later split batches like `6h + 30h` without manual production repair.
- Business impact:
  - `/api/admin/packages` now accepts `purchaseBatches` and writes multiple ordered `PURCHASE` txns instead of one merged txn when requested
  - `/api/admin/packages/[id]/top-up` supports the same split-batch input for future partner top-ups
  - the admin package create form and top-up modal now expose a batch-entry block for 新东方 students, including a one-click `6h + 30h` preset
  - total paid amount is proportionally allocated across the split purchase txns, while package totals and remaining balance behavior stay unchanged
  - no attendance deduction logic, student billing, parent billing, or offline monthly settlement logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - package create/top-up flows preserve tranche order for later partner settlement FIFO

## 2026-04-08-r09 Deployed

- Scope: change 新东方 split purchase-batch entry from minute/hour language to lesson-based entry so ops can record batch sales in the same `6 / 8 / 10 / 20 / 40 lessons` vocabulary they already use elsewhere.
- Business impact:
  - `app/admin/_components/PurchaseBatchEditor.tsx` now shows lesson counts for 新东方 rows, converts them to `45 minutes = 1 lesson` behind the scenes, and offers quick-add chips for `6 / 8 / 10 / 20 / 40 lessons`
  - enabling split purchase batches no longer jumps straight to a hard-coded `2160` minute template; create/top-up now start from the currently selected package total and let ops split it from there
  - the hint copy now uses lesson-bundle wording such as `8 lessons + 40 lessons`, keeping the entry UI aligned with how 新东方 packages are actually sold
  - no settlement FIFO logic, package balances, deduction logic, or invoice rules changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - 新东方 split batch rows now read/write in lessons while still storing minute totals under the hood

## 2026-04-09-r01 Deployed

- Scope: introduce scheduling coordination as a ticket-backed student-detail workflow so ops can follow up with parents, generate slot suggestions directly from trusted teacher availability, and decide whether a parent special-time request really needs a teacher exception.
- Business impact:
  - `lib/tickets.ts` now defines `SCHEDULE_COORDINATION / 排课协调`, so scheduling follow-up can stay inside the existing ticket workflow instead of becoming a separate system
  - `Ticket.studentId` now exists as a nullable relation, allowing student detail pages to show the active coordination ticket, owner, summary, and next follow-up directly on the student record
  - student detail pages can now generate the next 3-5 candidate slots from teacher availability without touching session creation, and can also check whether a parent-requested special time already matches current availability
  - `Todo Center` now surfaces due scheduling coordination follow-ups, so ops do not need to remember which parent timing conversations are aging out
  - ticket intake/admin edit flows no longer force a teacher field for every ticket type, allowing scheduling coordination tickets to stay parent-led by default
  - no session creation, attendance, booking-link approval, package balance, payroll, or finance logic changed
- Validation:
  - `npm run prisma:generate`
  - `npm run build`
  - post-deploy startup check
  - `/admin/students/[id]` should show the new scheduling coordination card and helper panels

## 2026-04-09-r02 Deployed

- Scope: add a lightweight teacher-side scheduling exception queue so teachers only answer coordination tickets that already fell outside their submitted availability.
- Business impact:
  - `/teacher/scheduling-exceptions` now lists only `排课协调 / Scheduling Coordination` tickets that are in `Waiting Teacher` or `Exception`
  - teachers can respond with `Can do`, `Cannot do`, or `Suggest another slot`, and the ticket is pushed back to ops with an updated next action instead of forcing teachers into the full admin ticket editor
  - the teacher sidebar now exposes `Scheduling Exceptions / 排课例外确认` alongside other daily teacher tasks
  - no teacher availability data, session creation logic, booking links, attendance, package balance, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - `/teacher/scheduling-exceptions` route should be present in the production build and protected by the normal teacher login flow

## 2026-04-09-r03 Deployed

- Scope: turn student-detail scheduling coordination results into action cards and let ops jump straight from a suggested slot into `Quick Schedule` with the same time and suggested teacher already carried over.
- Business impact:
  - generated candidate slots now render as readable cards instead of plain rows, so ops can scan date, time, teacher, and action much faster during parent follow-up
  - matching special-time results and nearest alternatives use the same card pattern, so there is one consistent path whether the parent request already fits availability or needs a fallback
  - `Quick Schedule` now respects a carried-over suggested teacher and floats that teacher to the top of the eligible list, reducing one more manual step for ops
  - if campus or subject still needs one extra confirmation, the card now says so explicitly before opening `Quick Schedule`
  - no teacher availability rules, session-creation endpoints, booking links, attendance, package balances, or finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - `/admin/students/[id]` coordination cards now show `Use in Quick Schedule` actions for generated slots, matched special requests, and nearest availability alternatives

## 2026-04-10-r24 Ready

- Scope: make the finance student package invoice picker easier to use when many students and packages are in the list.
- Business impact:
  - `/admin/finance/student-package-invoices` now lets finance search packages locally by student name, course name, or package ID before selecting one
  - the package picker no longer auto-submits on every dropdown change, so finance can search calmly and then confirm with `Load package summary / 加载课包摘要`
  - the invoice page keeps the same summary-loading and invoice-preview logic after the package is submitted
  - no invoice issuance rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify finance can search and narrow the package list locally before loading the package summary

## 2026-04-10-r25 Ready

- Scope: keep recently used package shortcuts on the finance invoice page so repeated invoice work does not require searching the same student packages again and again.
- Business impact:
  - `/admin/finance/student-package-invoices` now remembers recently chosen packages in the browser and shows them as one-click shortcuts near the package picker
  - choosing a recent package shortcut updates the selection without auto-submitting, so finance can still review the form and then confirm with `Load package summary / 加载课包摘要`
  - no invoice issuance rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify the finance invoice page shows `Recent packages / 最近使用课包` after a package has been loaded once
  - verify clicking a recent package chip changes the selected package but still waits for explicit summary load

## 2026-04-10-r26 Ready

- Scope: keep the finance receipt queue and history workable on narrower screens by opening selected receipt details in an overlay instead of forcing a long stacked layout.
- Business impact:
  - `/admin/receipts-approvals/queue` and `/admin/receipts-approvals/history` now open selected receipt details as a dismissible overlay on narrower screens, so finance can stay anchored in the queue list
  - the overlay includes an explicit `Back to list / 返回列表` action and outside-tap close path, both of which return to the same filtered queue or history view without changing the underlying review state
  - wider screens keep the existing two-column layout, so desktop finance users do not lose the side-by-side workflow
  - no receipt approval rules, package finance actions, invoice rules, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify narrow receipt queue/history screens now show the selected detail pane as an overlay with `Back to list / 返回列表`
  - verify wide screens still show the normal left queue plus right detail layout

## 2026-04-10-r27 Ready

- Scope: fix the narrow-screen receipt overlay so it does not auto-open on page load and feels more like a contained drawer than a full-screen takeover.
- Business impact:
  - narrow `Receipt Queue / 收据审批队列` and `Receipt History / 收据历史` screens now open the detail drawer only after finance explicitly clicks a receipt row
  - the drawer now sits with visible margins and a narrower width, so finance keeps more context of the page behind it
  - wider screens still keep the side-by-side queue and detail layout, and no receipt approval or package-finance logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify narrow queue/history views stay list-only until a row is clicked
  - verify the opened detail panel looks like a smaller drawer rather than covering almost the full viewport

## 2026-04-10-r28 Ready

- Scope: show amount information much more clearly in the selected receipt detail panel so finance can immediately tell which receipt is open.
- Business impact:
  - selected receipt details now show both `Receipt amount / 收据金额` and `Invoice total / 发票总额` near the top of the panel
  - the amount summary now also signals whether the receipt matches the linked invoice amount, reducing the chance that finance reviews the wrong row
  - no receipt approval rules, invoice rules, package finance actions, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify selected receipt details show the amount summary cards and mismatch indicator near the top

## 2026-04-10-r23 Ready

- Scope: make the package finance picker more compact so finance can see search, recent shortcuts, and package candidates without as much scrolling.
- Business impact:
  - the `Recently opened packages / 最近打开的课包` list now shows fewer, tighter rows so it stays useful without taking over the page
  - search-result and priority package cards now use a denser row layout with shorter metadata, keeping the package workspace higher on screen
  - clearing search also resets the quick-select field back toward the currently open package, reducing confusion after repeated searches
  - no invoice creation rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify the package picker now occupies less vertical space while keeping the same open-package actions

## 2026-04-10-r22 Ready

- Scope: stop package searching from reloading the whole finance workspace and give finance a clearer confirm flow before opening a package.
- Business impact:
  - the package workspace search now stays entirely in the browser, so finance can search repeatedly without refreshing the page each time
  - the search area now has explicit `Search / 搜索`, `Clear / 清除`, and `Open Finance Operations / 打开财务操作` buttons, making the flow clearer when package lists are crowded
  - recent-package shortcuts and priority package cards now use the same client-side opener, so they stay fast and consistent
  - no invoice creation rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify package search filters locally without a full page reload
  - verify only the open buttons navigate into a package workspace

## 2026-04-10-r21 Ready

- Scope: help finance jump back into recently handled student packages without searching from scratch each time.
- Business impact:
  - the package finance workspace now shows `Recently opened packages / 最近打开的课包`, so finance can reopen the same few active student packages in one click
  - opening a package from the search form, quick-select dropdown, or priority list now records that package into the recent list inside the current browser
  - finance can clear the recent list at any time without touching billing data, because the memory is stored only in browser local storage
  - no invoice creation rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify package opens now populate `Recently opened packages / 最近打开的课包`
  - verify the recent list offers direct reopen actions and can be cleared from the package workspace

## 2026-04-10-r20 Ready

- Scope: make the package finance workspace easier to open when finance is dealing with a large number of student packages.
- Business impact:
  - the package workspace opener now supports keyword search by student, course, invoice number, receipt number, and package ID, so finance no longer has to scan a crowded dropdown one item at a time
  - the same opener now shows a priority package list with direct `Open package / 打开课包` actions, pushing the most urgent finance packages to the top
  - the quick-select dropdown now follows the same filtered search results, so searching once narrows both the shortlist and the dropdown options together
  - no invoice creation rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify package search matches student, course, invoice number, receipt number, and package ID keywords
  - verify the priority package list shows direct `Open package / 打开课包` actions and floats urgent packages first
  - verify the quick-select dropdown only shows the currently filtered package matches

## 2026-04-10-r19 Ready

- Scope: add a filtered CSV export for receipt history and give the package finance workspace a more explicit next-step handoff.
- Business impact:
  - `Receipt History / 收据历史` now has a direct `Export CSV / 导出CSV` action that follows the current focus, side, month, action-type, and keyword filters instead of making finance copy table results manually
  - the history CSV now includes partner-side uploads, invoices, and receipts when finance switches to the partner view
  - the package workspace now shows a `Suggested next step / 建议下一步` panel that points finance straight to the most relevant next action for that package
  - no invoice creation rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify `Receipt History / 收据历史` exports CSV using the current filters
  - verify partner-side timeline rows appear in the CSV when `Partner only / 只看合作方` is active
  - verify the package workspace next-step panel points to upload, create receipt, review queue, or global queue according to current package state

## 2026-04-10-r18 Ready

- Scope: make the finance receipt flow easier to keep moving by improving next-item feedback, widening history filters, simplifying repair-card actions, and expanding package-workspace progress states.
- Business impact:
  - after approve/reject actions, finance now gets an explicit banner telling them whether they were moved onto the next receipt or whether the current queue lane is already clear
  - `Receipt History / 收据历史` now has one search/filter strip that can narrow by focus, party side, month, and action type instead of forcing finance to combine scattered controls
  - partner-side uploads, invoices, and receipts now appear in the history action timeline when finance switches to the partner view
  - repair queue cards now present one obvious primary fix action and tuck secondary links under `More actions / 更多操作`, reducing button noise on blocker-heavy screens
  - the package workspace now exposes four progress cards, ending with `Step 4 Approval Queue / 步骤4 进入审批`, plus compact chips showing usable proofs, receipt count, waiting approvals, and completed receipts
  - no invoice rules, receipt rules, approval logic, package balances, settlement calculations, or deduction logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify approve/reject actions show either the next-item banner or the queue-cleared banner
  - verify history filters now include party side and month, and partner recent actions appear when selected
  - verify repair queue cards now show a single primary fix action with `More actions` for secondary paths
  - verify package workspace now shows four progress cards and the extra status chips

## 2026-04-10-r01 Ready

- Scope: add a read-only `Statement of Account / 对账单` PDF for one parent package and make receipt-export gating much clearer to finance users.
- Business impact:
  - `/api/exports/parent-statement/[id]` now generates a finance-facing package statement that lists invoice transactions, approved receipt payments, running balance, pending receipts not yet counted, and the current balance owing
  - the same statement PDF now reads more like a formal outward-facing finance document, with a cleaner heading area, summary row, and more scannable transaction table
  - `/admin/finance/student-package-invoices` now exposes a direct statement export link once a package is selected, so finance can export the package statement without jumping into another workflow first
  - the same finance invoice page now shows `Prepared by / 创建人` in the preview block and `Created by / 创建人` in the recent invoice table, so finance can see who issued each invoice without opening another page
  - when the invoice creator matches a known user record, the recent invoice table now shows `Name (email)` instead of only a raw email string
  - `/admin/packages/[id]/billing` now resolves the invoice `By` column the same way, so package billing no longer falls back to raw emails when the user profile exists
  - `/admin/receipts-approvals` now checks proof-file health against each queue row's linked payment record even in the all-packages queue, so valid uploads no longer get falsely blocked as missing just because no package filter is selected
  - receipt finance work is now split into four clearer routes: `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History`, so approval, package handling, repair, and lookup no longer compete on one long mixed page
  - `Proof Repair` now defaults to a blocker-first repair queue, so rejected receipts and other repair-needed rows still appear even when there are no pure attachment-health issues
  - the `All / 全部` chip on `Proof Repair` now explicitly clears into the wider repair-page queue instead of bouncing back into the implicit default blocker filter
  - `Receipt History` now suppresses the lower bucket-switch controls that conflicted with the top `Receipt History` page mode, leaving only history-safe controls on that screen
  - `Receipt History` now routes `Back to default queue / 回到默认队列` back to `/admin/receipts-approvals` instead of staying on `/history`, which fixes the false "button did nothing" feeling during QA
  - finance sidebar and receipt-center `Receipt Queue / 收据审批队列` links now explicitly clear remembered queue state, so clicking the queue entry always lands on the live approval queue instead of unexpectedly reopening history
  - the top receipt-page `Receipt Queue / 收据审批队列` tab now also clears remembered queue state instead of preserving `queueBucket=HISTORY`, so the page-level mode switch behaves the same way as the sidebar
  - `/admin/packages/[id]/billing` now exposes the same statement export link and replaces the vague receipt `Pending approval` copy with a clearer explanation that formal receipt PDFs unlock only after manager and finance approval
  - `/admin/receipts-approvals` now uses the same plain-language receipt export message, reducing confusion without changing the approval gate itself
  - no invoice creation rules, receipt creation rules, approval requirements, package balance math, settlement logic, or deduction behavior changed
- Validation:
  - `npm run build`
  - verify statement export works from both finance invoice workbench and package billing
  - verify unapproved receipts are shown as pending and still excluded from formal paid totals
  - verify `Proof Repair` shows repair blockers by default, while the explicit `Proof or file issues` chip still narrows to attachment-only problems
  - verify clicking `All / 全部` inside `Proof Repair` actually widens the page queue instead of appearing stuck
  - verify `Receipt History` no longer shows conflicting lower bucket toggles such as `Show all buckets` and `Only open work`
  - verify `Back to default queue / 回到默认队列` from `Receipt History` lands on `/admin/receipts-approvals?clearQueue=1`
  - verify clicking the finance sidebar `Receipt Queue / 收据审批队列` entry opens `/admin/receipts-approvals?clearQueue=1` and no longer re-enters `Receipt History`
  - verify clicking the top `Receipt Queue / 收据审批队列` page tab from `Receipt History` also opens `/admin/receipts-approvals?clearQueue=1`

## 2026-04-11-r34 Ready

- Scope: make scheduling-coordination wording bilingual and expose duplicate open coordination tickets on the student workbench.
- Business impact:
  - the student scheduling-coordination card now warns when a student has more than one open coordination ticket and shows which ticket is currently selected by the system
  - the same student card now lists the open ticket numbers so ops can jump straight into the right ticket instead of guessing
  - scheduling-coordination system text now renders as Chinese + English on the student coordination card, ticket detail page, admin ticket list, archived ticket list, and teacher ticket list, which cleans up old test tickets that previously looked half-English
  - future parent-availability summaries now save bilingual field labels such as `可上课星期 / Available days` and `老师偏好 / Teacher preference`
  - no package rules, finance logic, receipt rules, invoice rules, attendance logic, or scheduling placement logic changed
- Validation:
  - `npm run build`
  - post-deploy startup check
  - verify `赵测试` shows the duplicate-ticket warning on the student coordination card when multiple open coordination tickets exist
  - verify student and ticket views now show bilingual scheduling-coordination summary text instead of English-only system copy
  - verify new parent submissions write bilingual summary labels into the linked coordination ticket

## 2026-04-11-r35 Ready

- Scope: reuse the current open scheduling-coordination ticket instead of creating another one for the same student.
- Business impact:
  - student detail now shows a clearer `Open active ticket / 打开当前工单` action and a reuse note whenever the student already has an open coordination ticket
  - the student-side server action now redirects back with `Existing coordination ticket reused / 已沿用当前排课协调工单` instead of silently opening a second path
  - the ticket-intake API now returns the existing open scheduling-coordination ticket for the same student, which prevents duplicate test tickets from being created through intake links
  - the intake form now surfaces a bilingual reuse success message and still exposes the existing parent-availability link when that open ticket is still waiting for submission
  - no scheduling placement rules, finance logic, package logic, receipt logic, invoice logic, or attendance logic changed
- Validation:
  - `npm run build`
  - verify student detail shows only the reuse/open-current action when an open coordination ticket already exists
  - verify the student-detail create action returns to the coordination card with a bilingual reuse message instead of creating another open ticket
  - verify ticket intake returns the current open coordination ticket for the same student and shows the bilingual reuse success message
## 2026-04-24-r94 Ready

- Scope: make direct-billing renewal signing increase package balance automatically and reframe old direct package top-up as a special/manual operation.
- Business impact:
  - when a direct-billing renewal contract is signed, the system now adds the renewal lesson minutes onto the same package automatically instead of leaving ops to do a second manual top-up
  - the same renewal signature still auto-creates the parent invoice draft, so the renewal path now closes as `sign -> add hours -> invoice draft`
  - direct-billing package edit modal now labels old top-up as a legacy/manual path and warns that it bypasses renewal contract + auto-invoice workflow
  - partner-style top-up behavior is unchanged
- Validation:
  - `npm run build`
  - verify temporary renewal QA package moved from `600 / 600` minutes to `900 / 900` minutes after signature
  - verify one invoice draft was created for the signed renewal contract
  - verify one package purchase txn exists with note marker `student-contract-renewal-topup:<contractId>`
  - verify all temporary QA data was removed afterwards

## 2026-04-24-r95 Ready

- Scope: polish the student contract workflow with business-facing status labels, stronger contract entry points from student detail, lighter parent pages, explicit signed-contract correction guidance, and cleaner archived/void history.
- Business impact:
  - student detail now surfaces the contract workspace directly and explains the next business step instead of exposing only technical contract states
  - package billing now shows clearer sign-stage and signed-stage guidance, including direct invoice/open-approval links once a contract has produced an invoice
  - parent intake and sign pages now frame the process as a simple three-step journey, reducing parent-facing clutter without changing the underlying workflow
  - signed or invoiced contracts now steer ops toward `void + regenerate` instead of implying direct edits to historical contract versions
  - void drafts that are safe to delete stay separate from archived signed/invoiced history, so active workspaces no longer fill up with old contract noise
  - direct-billing packages with clear legacy billing/use history but no contract now warn ops that the next renewal should use the renewal-contract path
  - no signing rules, invoice math, package balance rules, partner exclusions, or receipt logic changed
- Validation:
  - `npm run build`
  - verify student detail shows the direct contract workspace link and stage-specific next-step message
  - verify package billing shows business-stage copy for sign-ready contracts and invoice/open-approval links for signed/invoiced contracts
  - verify parent intake page shows `Parent profile confirmation / 家长资料确认`
  - verify parent sign page shows `Agreement preview / 正式合同预览`
  - verify temporary QA student/package/contract/auth-session data was removed afterwards

## 2026-04-24-r96 Ready

- Scope: make package edits resync invoice-gate status and reason when settlement mode changes, so direct-billing packages no longer keep stale partner-settlement wording.
- Business impact:
  - editing a package from partner settlement back to direct-billing now also refreshes the package invoice-gate copy instead of leaving old partner wording behind
  - approval-backed package gate states remain intact when approval history exists
  - packages without approval history now at least fall back to a correct generic direct-billing exempt message instead of the wrong partner message
  - no receipt rules, invoice totals, partner settlement calculations, or scheduling rules changed
- Validation:
  - `npm run build`
  - verify `赵测试` package now stores `settlementMode = null`
  - verify `赵测试` package now stores `financeGateReason = Package is exempt from direct-billing invoice gate.`

## 2026-04-24-r97 Ready

- Scope: make signed-contract signatures visible again by requiring handwritten signature image capture for future signings and serving a compatibility rendering for legacy signed contracts that have no stored signature image.
- Business impact:
  - future parent sign attempts now stop with a clear error unless a handwritten signature is actually drawn
  - the signed confirmation page now shows the captured signature block instead of only invoice/download info
  - older signed contracts that were completed before the handwritten-signature requirement will no longer download with an empty signature area
  - no invoice math, contract snapshot payloads, package balance rules, or partner-exclusion logic changed
- Validation:
  - `npm run build`
  - verify a temporary `READY_TO_SIGN` contract now rejects empty `signatureDataUrl` with `Handwritten signature is required`
  - generate a compatibility PDF for an existing signed contract with `signatureImagePath = null`
  - render the compatibility PDF and verify the signature block is visible instead of blank

## 2026-04-24-r98 Ready

- Scope: make the signed-contract correction path explicit in package billing by explaining that `Void` is no longer available after signing and that ops should stop using the old invoice draft before creating a replacement contract version.
- Business impact:
  - signed/invoiced contracts now clearly explain why the `Void` action is missing
  - ops and finance now get a direct two-step correction path: open the old invoice lane first, then create a replacement contract version
  - no contract-state rules, invoice creation logic, package balances, or partner exclusions changed
- Validation:
  - `npm run build`
  - verify the signed-result card now warns not to keep using the old invoice draft
  - verify the terminal contract warning explicitly says `Void` is no longer available after signing

## 2026-04-24-r99 Ready

- Scope: let ops delete the old invoice draft from a signed student contract, detach that invoice from contract history, and immediately create a replacement contract version that reuses the previous parent profile.
- Business impact:
  - signed contracts that only have an unreceipted invoice draft can now be corrected in one cleaner path from package billing
  - deleting the old invoice draft now clears the contract’s linked invoice fields instead of leaving stale invoice references behind
  - the linked package invoice-approval rows for that deleted draft are removed as part of the correction cleanup
  - replacement contract creation is no longer blocked by old `SIGNED / INVOICE_CREATED` versions on the same package
  - replacement first-purchase contracts now reuse the previous parent profile so ops do not need to resend the parent intake form just to correct fee or contract details
  - no receipt logic, partner settlement logic, or signed PDF logic changed
- Validation:
  - `npm run build`
  - verify deleting a signed contract’s old invoice draft clears `invoiceId / invoiceNo / invoiceCreatedAt` from that contract
  - verify the contract falls back to signed history
  - verify replacement contract creation produces a fresh `CONTRACT_DRAFT`
  - verify the replacement contract reuses the previous parent profile instead of reopening intake

## 2026-04-24-r100 Ready

- Scope: simplify the contract section in package billing by reducing repeated bilingual copy and replacing the old “save draft” plus “generate/refresh sign link” sequence with one main save-and-prepare action.
- Business impact:
  - ops no longer need two separate clicks just to save fee details and prepare the latest sign link
  - the contract draft section now explains one cleaner action instead of a save-then-regenerate workflow
  - the signed-result summary is shorter and easier to scan, without duplicated invoice and approval labels
  - no contract-state rules, invoice creation logic, signed-PDF behavior, or partner exclusions changed
- Validation:
  - `npm run build`
  - verify editing lesson hours / fee / bill-to / agreement date and submitting once updates the draft and prepares the latest sign link
  - verify the `READY_TO_SIGN` state now offers a single “save and refresh sign link” action
  - verify the signed-result card no longer duplicates bilingual labels on invoice, gate, and approval rows
  - task doc: `docs/tasks/TASK-20260424-student-contract-billing-copy-and-action-simplify.md`
  - release-doc bundle finalized in the same release train

## 2026-04-24-r101 Ready

- Scope: make the public contract sign page refresh into a clear submitted-success state after the parent clicks `Sign contract`, instead of silently landing back on the same page.
- Business impact:
  - parents now see an explicit green confirmation banner immediately after a successful sign submit
  - the public sign route is revalidated before redirect so the signed-result view is less likely to lag behind the database update
  - no contract-status rules, invoice creation logic, signed PDF output, or partner exclusions changed
- Validation:
  - `npm run build`
  - verify sign submit revalidates the public contract route before redirect
  - verify `?msg=signed` now shows a clear success banner at the top of the sign page

## 2026-04-24-r104 Ready

- Scope: make address optional in both parent-facing intake pages and keep contract generation compatible when no address is provided.
- Business impact:
  - parents can now submit student intake and contract-profile forms without sharing an address
  - the school team can continue to reuse parent details even when address is blank
  - signed and unsigned contract snapshots will no longer print an empty address row when no address is on file
  - no contract-state rules, invoice creation logic, package balances, or partner exclusions changed
- Validation:
  - `npm run build`
  - verify `/student-intake/[token]` marks address as optional and accepts submission without it
  - verify `/contract-intake/[token]` marks address as optional and accepts submission without it
  - verify contract snapshot generation omits the address line when address is absent
  - task doc: `docs/tasks/TASK-20260424-parent-address-optional-intake.md`

## 2026-04-24-r105 Ready

- Scope: render the full partner invoice settlement list across paginated PDF pages instead of collapsing the export after the first 10 rows.
- Business impact:
  - finance can print and share partner invoices with every selected settlement line visible
  - long partner invoice batches no longer end with a hidden `... and N more items` summary
  - continuation pages keep invoice/table headers so reviewers do not lose context across pages
  - no invoice totals, approval flow, or receipt behavior changed
- Validation:
  - `npm run build`
  - export a partner invoice with more than 10 selected settlement rows
  - verify every row appears across one or more pages
  - verify the old collapsed-summary line is gone
  - task doc: `docs/tasks/TASK-20260424-partner-invoice-full-line-pagination.md`

## 2026-04-24-r106 Ready

- Scope: tighten the follow-up partner invoice summary-page layout so the totals and remittance notes sit directly after the last rows instead of drifting to the page bottom.
- Business impact:
  - finance no longer sees a mostly blank final page with totals floating at the bottom
  - remittance notes remain fully readable on the last page
  - the full multi-page line-item rendering from `r105` stays intact
  - no invoice totals, approval flow, or receipt behavior changed
- Validation:
  - `npm run build`
  - export a multi-page partner invoice
  - verify subtotal / GST / amount due appear directly after the final row set
  - verify remittance notes are fully visible on the last page
  - task doc: `docs/tasks/TASK-20260424-partner-invoice-final-page-layout-followup.md`

## 2026-04-24-r107 Ready

- Scope: move the optional partner invoice seal next to the subtotal summary area instead of leaving it pinned near the lower page edge.
- Business impact:
  - finance sees the seal where they expect it, aligned with the subtotal summary block
  - the seal no longer looks detached from the financial totals on long partner invoices
  - no line-item pagination, totals, approval flow, or receipt behavior changed
- Validation:
  - `npm run build`
  - export a sealed partner invoice
  - verify the seal sits beside the subtotal block
  - verify subtotal / GST / amount due remain readable
  - task doc: `docs/tasks/TASK-20260424-partner-invoice-seal-near-subtotal.md`

## 2026-04-24-r108 Ready

- Scope: push the optional partner invoice seal closer so it visibly anchors to the subtotal block instead of reading as a detached page-bottom element.
- Business impact:
  - finance now sees the seal clearly attached to the subtotal summary area
  - the subtotal block remains readable while the stamp placement looks intentional
  - no invoice line rendering, totals, approval flow, or receipt behavior changed
- Validation:
  - `npm run build`
  - export a sealed partner invoice
  - verify the seal visibly overlaps or hugs the subtotal area
  - verify subtotal / GST / amount due remain readable
  - task doc: `docs/tasks/TASK-20260424-partner-invoice-seal-subtotal-overlap-followup.md`

## 2026-04-24-r109 Ready

- Scope: compact the final page of partner invoices so long settlement batches do not leave a large blank area before totals, while keeping the optional seal and remittance notes attached to the subtotal block as one grouped section.
- Business impact:
  - finance sees fuller use of the last content page before the totals block
  - the optional seal now stays visually locked to the subtotal area instead of drifting lower than expected
  - remittance notes and bank details start below the totals/seal group, so the page reads as one coherent finance summary
  - no invoice totals, selected settlements, approval flow, or receipt behavior changed
- Validation:
  - `npm run build`
  - export a multi-page sealed partner invoice
  - verify line items continue lower before the totals summary starts
  - verify the seal sits against the subtotal block
  - verify remittance notes begin below the totals/seal group
  - task doc: `docs/tasks/TASK-20260424-partner-invoice-final-page-compaction-and-seal-anchor.md`

## 2026-04-24-r110 Ready

- Scope: give first-purchase setup its own admin page so student detail no longer carries a large mixed-purpose embedded form.
- Business impact:
  - ops can start first-purchase setup from a clearer, more prominent CTA on the student detail page
  - the setup form no longer competes with package, scheduling, and profile sections on the same page
  - duplicated bilingual wording is reduced because the dedicated page only explains the step once
  - successful setup now flows directly into the package contract workspace
- Validation:
  - `npm run build`
  - verify student detail shows a dedicated first-purchase CTA instead of the large inline form
  - verify `/admin/students/[id]/first-purchase` loads and shows the setup fields once
  - verify submit redirects into `/admin/packages/[id]/contract`
  - task doc: `docs/tasks/TASK-20260424-student-first-purchase-dedicated-page.md`
- 2026-04-24 `c54a15a` Finance document centers: shipped a full invoices/receipts page plus deleted draft invoice history page, and linked them into finance workbench, package billing, package contract, and partner settlement billing.

## 2026-04-24-r112 Ready

- Scope: add the finance document center and deleted draft invoice history pages to the finance-role access allowlist and sidebar navigation.
- Business impact:
  - finance users can now open the two new pages directly instead of getting bounced back to another finance page
  - the pages are now discoverable from the sidebar, not only through deep links inside workspaces
  - no invoice, receipt, or approval data changes
- Validation:
  - `npm run build`
  - verify finance sidebar shows `Invoices & Receipts` and `Deleted Draft History`
  - verify finance users can open `/admin/finance/documents`
  - verify finance users can open `/admin/finance/deleted-invoices`
  - task doc: `docs/tasks/TASK-20260424-finance-document-center-nav-and-allowlist.md`

## 2026-04-24-r113 Ready

- Scope: move the student-detail first-purchase CTA card to the top of the page content so ops can start首购建档 immediately.
- Business impact:
  - ops no longer need to scroll down past planning and enrollment sections to find the first-purchase entry point
  - the CTA still opens the same dedicated first-purchase setup page
  - no intake, contract, invoice, or package logic changed
- Validation:
  - `npm run build`
  - verify the `Start first purchase setup / 开始首购建档` card shows before the summary cards
  - verify the original lower duplicate location is gone
  - verify the dedicated first-purchase page field labels are no longer duplicated
  - task doc: `docs/tasks/TASK-20260424-student-detail-first-purchase-cta-top.md`

## 2026-04-24-r114 Ready

- Scope: fix the first-purchase setup redirect flow so successful submits do not render a red `NEXT_REDIRECT` banner on the dedicated setup page.
- Business impact:
  - ops can complete `创建首购课包和合同` without seeing a misleading framework error after success
  - successful submits now continue into the package contract workspace as intended
  - genuine validation or business-rule failures still route back to the setup page with a readable message
  - no contract rules, package payloads, or intake eligibility logic changed
- Validation:
  - `npm run build`
  - verify successful submit rethrows the redirect and lands in `/admin/packages/[id]/contract`
  - verify ordinary failures still redirect back with `err=...` instead of crashing
  - task doc: `docs/tasks/TASK-20260424-first-purchase-redirect-error-fix.md`

## 2026-04-24-r115 Ready

- Scope: rename student contract PDF downloads to a business-readable format for both admin and parent downloads.
- Business impact:
  - contract PDFs no longer download with a technical internal-style filename
  - ops and parents now receive clearer names such as `学生名_课程名_首购合同_已签_YYYYMMDD.pdf`
  - the same naming convention applies whether the PDF is downloaded from admin pages or the parent signing link
  - no contract, signing, billing, or invoice behavior changed
- Validation:
  - `npm run build`
  - verify signed and unsigned contract downloads use the new business-friendly filename pattern
  - verify parent token downloads and admin downloads share the same naming logic
  - task doc: `docs/tasks/TASK-20260424-student-contract-download-filename.md`

## 2026-04-24-r116 Ready

- Scope: fix the stored signed-contract download branch so older saved PDFs also use the business-readable filename instead of the old technical fallback.
- Business impact:
  - already-saved signed contract PDFs now download with the same business-friendly naming pattern as regenerated PDFs
  - admin downloads and parent-access downloads no longer diverge based on whether the PDF came from storage or regeneration
  - inline preview responses now advertise the same UTF-8 filename too
  - no contract, signing, invoice, or permission logic changed
- Validation:
  - `npm run build`
  - verify stored signed-contract responses use the business filename in `Content-Disposition`
  - verify inline and attachment headers both include the UTF-8 filename
  - task doc: `docs/tasks/TASK-20260424-stored-student-contract-download-filename-fix.md`

## 2026-04-24-r117 Ready

- Scope: add the missing renewal CTA to the package contract workspace after a first-purchase contract is already signed.
- Business impact:
  - ops no longer need to infer that renewal should happen elsewhere after a signed首购合同
  - the same contract workspace now shows both next-step options: start a renewal or create a correction/replacement version
  - no contract signing, invoice, or package rules changed
- Validation:
  - `npm run build`
  - verify a signed first-purchase contract now exposes `Create renewal contract / 创建续费合同`
  - verify the replacement-contract CTA still remains visible for correction scenarios
  - task doc: `docs/tasks/TASK-20260424-package-contract-renewal-cta-after-first-purchase.md`


## 2026-04-24-r118 Ready

- Scope: let the current package's signed first-purchase contract count as reusable parent info for renewal.
- Business impact:
  - a package that already has a signed首购合同 now correctly shows `Create renewal contract / 创建续费合同`
  - ops can start renewal directly from the same package workspace instead of being blocked by a false "no reusable parent profile" condition
  - no signing, invoice, or partner-settlement rules changed
- Validation:
  - `npm run build`
  - verify `赵测试 2`-style packages with only a signed current-package first-purchase contract now show the renewal CTA
  - verify renewal draft creation succeeds from the same package workspace
  - task doc: `docs/tasks/TASK-20260424-renewal-parent-info-current-package-fix.md`
