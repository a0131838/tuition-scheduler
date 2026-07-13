Warning: truncated output (original token count: 87965)
Total output lines: 4693

# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-07-13`
- Health check: `/admin/login` => `200`
- Version alignment: `ALIGNED`
- Exact server/local/origin commit hashes: use `bash ops/server/scripts/new_chat_startup_check.sh`

## Current Known State

- Local HEAD: current production branch head for `feat/strict-superadmin-availability-bypass`.
- Previous server fix remains in place: upload static paths under `/uploads/*` are reachable.
- `bash ops/server/scripts/new_chat_startup_check.sh` confirmed local/origin/server are aligned and `/admin/login` => `200`.
- Current production release: `2026-07-13-r240` at `caa9cbd`. `2026-07-13-r239` native-miniapp UI/search source is included in the Git lineage but has not been uploaded to WeChat.
- `2026-03-26-r1`, `2026-03-26-r2`, and `2026-03-26-r3` are now live on the current server commit lineage.
- Release-doc gate requires `CHANGELOG-LIVE`, `RELEASE-BOARD`, and a matching `TASK-*` file in the same deploy commit.

## Open Risks

- Full-care-action monitoring: `2026-07-13-r240` is live. The module-level Server Action helper passed real production-mode submissions before deploy; post-deploy health checks and protected-data baselines pass. No pilot engagement exists yet, and parent publishing remains disabled.
- Full-care-core monitoring: `2026-07-13-r238` is live with five isolated care tables and `/admin/care`; all five care tables remain empty until management explicitly creates pilot drafts. Teaching and finance baselines were preserved after deploy.
- Working tree hygiene risk: local repo currently contains unrelated untracked files and generated artifacts; avoid mixing them into deploy commits.
- Miniapp review-readiness risk: the code is hardened, but privacy contact/retention details and WeChat backend screenshots still require Zhao input before submitting 1.0.0. Do not submit with invented retention promises or a reviewer path that exposes real student data.
- Feedback-notification rollout risk: `2026-07-12-r233` queues only the first teacher feedback publication. Invoice and feedback share the same official ID but keep separate authorization intent; verify the first real feedback and confirm edits do not enqueue duplicates.
- Service-consent UI risk: WeChat returned only the first ID from each two-template service/document request even when the parent allowed the displayed option. `2026-07-12-r232` changes these to four one-template buttons; verify finance and receipt each record one `accept` after deployment.
- Request/finance notification rollout risk: `2026-07-12-r231` adds four official one-time templates. Delivery is consent-gated and permission-scoped; verify both new parent authorization groups and one controlled display test for request, unpaid, invoice, and receipt messages before broad use.
- Reminder-coverage rollout risk: `2026-07-12-r230` derives a parent's shared quota across every linked student and assigns it to the earliest future lessons for display. The staff attention list is read-only and permission-restricted; verify the first multi-student family and first no-consent reminder after release.
- Reminder-cron monitoring: deploy cleanup previously removed `ops/logs`, causing shell redirection to fail before queue/sender startup. `2026-07-12-r229` now creates the directory per run and reinstalls the cron after each deploy; the first automatic production replay passed.
- Three-template consent risk: `2026-07-12-r228` joint authorization returned three `accept` results on a real phone. All three payload mappings have passed direct WeChat sends; continue monitoring normal parent usage and consent replenishment.
- Automatic course-reminder risk: `2026-07-12-r227` sends only due 24-hour reminders when accepted consent exceeds prior sends. Monitor the first real parent reminder; 6-hour automation remains disabled.
- Course-reminder template monitoring: all three official course-template keyword mappings have passed direct sends, and the original template has also passed the automatic cron path. Continue checking consent balance and parent-facing wording during normal use.
- Deploy branch-fetch risk: the first r226 deploy attempt remained on the previous remote-tracking commit because the server's narrow fetch refspec did not update the requested feature branch; r226 now fetches that branch into its exact remote-tracking ref before reset/build.
- Miniapp-phase-two risk: `2026-07-11-r225` adds ADMIN-only location and series scheduling writes plus teacher-originated Ticket creation. Location changes move one Session to a cloned same-course Class, series writes are all-or-nothing for 2-12 weeks, and teacher requests do not modify schedules. Monitor the first real action in each path and confirm reports retain the expected course/student context.
- Miniapp-mobile-academic-actions risk: `2026-07-11-r224` adds ADMIN-only writes for leave/cancellation, one-session teacher replacement, and first scheduling from a Ticket. Every write requires a fresh signed preview and transaction revalidation; monitor Eva/Jasmine's first real action in each workflow and confirm the matching Ticket completion result before wider daily use.
- Miniapp-scheduling-owner risk: `2026-07-11-r223` allows permitted staff to change scheduling Ticket owner. Allowed values are restricted to unassigned, Jasmine, Eva, and Emily; every change is audited and older clients preserve the current owner when omitting the field.
- Miniapp-scheduling-board-scope risk: `2026-07-11-r222` broadens the r221 board from exact `排课协调` Tickets to all six scheduling-related web Ticket Center categories. Existing permission, transition, and audit controls remain; verify operators notice each Ticket's original type label before updating it.
- Miniapp-coordination-board risk: `2026-07-11-r221` exposes all open scheduling-coordination Tickets to ADMIN, CS, and CS-workspace staff and allows communication/status/follow-up updates. It does not complete Tickets or write Sessions; monitor the first Eva/Jasmine updates for correct owner, next action, and due date usage.
- Miniapp-scheduling-ticket-closure risk: `2026-07-11-r220` can complete open scheduling-coordination Tickets together with a mobile scheduling write. Selection defaults empty, is restricted to same-student/same-course preview results, and is revalidated in the same transaction; monitor the first real closure before broadening automatic workflow actions.
- Miniapp-scheduling-write risk: `2026-07-11-r219` adds real Session creation/rescheduling from the miniapp. Each operation is ADMIN-only, single-session, preview-signed, revalidated immediately before apply, and audited; monitor Eva/management's first real operations before expanding to teacher/room changes or future-series updates.
- Miniapp-scheduling-coordination risk: `2026-07-11-r218` lets ADMIN/CS staff create or update internal scheduling-coordination Tickets from lesson detail and append communication notes. It intentionally stops before changing lesson times; staff must still use the desktop scheduling workflow for the final timetable write.
- Parent-request-formal-fields risk: `2026-07-11-r217` adds a Ticket migration and structured parent-request fields. Existing `家长小程序` Tickets are marked parent-visible and receive best-effort backfill; confirm a historical Emily-assisted request still shows only its external summary to a parent and its internal note to staff.
- Deploy-env-miniapp-credentials risk: `2026-07-10-r216` changes only deploy env rendering so future deploys preserve WeChat miniapp credentials in `.env`; verify miniapp login does not regress after deploy.
- Parent-request-completion-result risk: `2026-07-10-r215` blocks staff/admin from marking parent requests completed unless a parent-visible completion result is provided; verify Eva/Jasmine understand the result will be visible to parents.
- Staff-assisted-request-visibility risk: `2026-07-10-r214` changes parent-request DTO projection. Verify parents only see the public summary, while staff/admin still see internal original notes and communication source for assisted requests.
- Student-schedule-PDF-teacher risk: `2026-07-10-r213` changes only the student monthly schedule PDF teacher label to use per-session replacement teachers when present; scheduling, replacement history, attendance, package balances, payroll, billing, partner settlement, miniapp, and OpenClaw behavior remain unchanged.
- Staff-assisted-parent-request risk: `2026-07-10-r212` adds a staff-authenticated Ticket creation path for WeChat-group-style parent requests. Verify Emily/Eva can select the intended student and that parent-visible summaries are written carefully before completing requests.
- Staff-miniapp-attendance risk: `2026-07-10-r211` adds a miniapp write path for teacher attendance marking; it preserves existing deduction/package fields and only lets a linked teacher write attendance for their own sessions.
- Staff-miniapp-WXML-render risk: `2026-07-10-r210` removes complex WXML fallback expressions from staff pages and prevents optional staff-home count API timeouts from blanking the workbench after the WeChat Developer Tool showed a blank staff workbench; this should improve miniapp rendering compatibility without changing backend behavior.
- Staff-miniapp-feedback risk: `2026-07-10-r209` adds a miniapp write path for teacher after-class feedback; it reuses the existing five-section parent-facing feedback requirements and checks that the staff user is linked to the lesson teacher before writing.
- Staff-miniapp-schedule risk: `2026-07-10-r208` adds read-side daily schedule access for mobile staff; teacher-role accounts are constrained to their linked teacher schedule, while ops/management can see all lessons for same-day coordination.
- Staff-request-filter risk: `2026-07-10-r208` adds miniapp request type filtering only; parent request creation, ownership, status transitions, and notifications remain unchanged.
- Miniapp-domain risk: `2026-07-10-r207` switches the native miniapp default API base to `https://sgtmanage.com`; WeChat public platform must whitelist this domain for request, uploadFile, and downloadFile before formal-device testing.
- Miniapp-auth risk: `2026-07-10-r207` adds parent/staff miniapp sessions and binding tables; production use still depends on configuring `WECHAT_MINIAPP_SECRET` and WeChat subscription template IDs.
- Partner-rate-entry risk: `2026-07-08-r206` removes the rate save action from Partner Settlement so operators must edit master rates in Partner Setup; existing settlement records keep their saved amounts and are not automatically recalculated.
- Multi-partner settlement risk: `2026-07-08-r205` adds `Partner` configuration and `partnerId` filtering to settlement, billing, receipts, payment proofs, and top-up snapshots; verify operators select the correct partner before creating invoices.
- Teacher-feedback scan risk: `2026-07-02-r204` increases the read-side overdue scan from 600 to 2000 sessions, while keeping the visible work item cap at 500; monitor page load if historical session volume grows substantially.
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
- Teacher-feedback input risk: `2026-04-25-r123` changes the teacher feedback form from one textarea to five section textareas plus preview, so deploy verification should confirm old formatted feedback still parses and new submits assemble into the same saved fields.
- Admin-feedback forwarding risk: `2026-04-25-r124` changes the primary copied text for feedback forwarding to a parent-readable WeChat format, while keeping a separate internal-record copy button for audit-style text.
- Student-academic-management risk: `2026-04-25-r125` adds nullable student management fields and a Todo Center read path for active-package students without upcoming lessons; verification should confirm the page renders before operators start filling these fields.
- Academic-management-followup risk: `2026-04-25-r126` adds quality/completeness signals and an academic management monthly report without touching OpenClaw; verification should confirm the new report and Todo Center render correctly with mostly empty profile fields.
- Academic-management-lane risk: `2026-04-25-r128` corrects the split to use student type as the academic-management source of truth and shows package settlement differences as warnings only; verification should confirm the filters do not change billing, settlement, scheduling, or attendance data.
- Todo-academic-alert UI risk: `2026-04-25-r129` moves the Todo Center academic lane filter to client-side switching and changes pill counts to visible alert counts; verification should confirm lane buttons no longer reload the full page and counts match the rows shown.
- Quick-schedule wording risk: `2026-04-29-r130` clarifies student time conflicts so an existing session's room does not look like the currently selected room was ignored; verification should confirm room conflict logic and scheduling writes remain unchanged.
- Expense-paid-history risk: `2026-05-07-r131` adds an include-archived paid-claims view and extends CSV export to match it; verification should confirm finance can see both active and archived paid claims without changing payment records.
- Finance-document-export risk: `2026-05-08-r132` derives invoice payment status from finance-approved receipts and adds filtered Excel export; verification should confirm finance understands pending or rejected receipts are not counted as paid.
- Company-name-change risk: `2026-05-08-r133` updates document headers and remittance account names to `GT Educational Institute Pte. Ltd.`; finance should confirm bank account naming is legally/banking correct before using PDFs externally.
- Package-ledger-PDF-display risk: `2026-05-08-r134` changes only hour/minute formatting in package-ledger displays and exports; verification should confirm old deductions are not manually corrected because stored ledger data already contains the correct `-90` minute values.
- Teacher-notice risk: `2026-05-08-r135` adds a teacher portal announcement and read tracking; verification should confirm teachers can still open the dashboard and marking a notice read does not affect teaching, payroll, or expense workflows.
- Teacher-notice-admin risk: `2026-05-08-r136` lets admin/finance publish and archive teacher notices with read tracking; verification should confirm notice writes affect only `AppSetting` notice keys and do not touch teacher payroll, expenses, classes, or attendance.
- Teacher-notice-nav risk: `2026-05-08-r137` moves the notice admin link higher in the sidebar only; verification should confirm the route remains reachable for admin and finance users.
- Shared-mobile-CSS risk: `2026-05-08-r138` changes shared small-screen CSS for admin and teacher pages; verification should confirm phone layouts are easier to tap and tables scroll inside their containers without changing desktop behavior.
- Tutor-cost-cutoff-export risk: `2026-05-09-r139` adds a read-only finance Excel export for completed and confirmed tutor cost from the 15th to month-end; verification should confirm finance understands it is not arranged-future-session cost and that zero-rate rows indicate missing teacher-rate setup.
- Tutor-cost-sidebar risk: `2026-05-09-r140` changes navigation and FINANCE role access for the tutor cost export only; verification should confirm both admin and finance sidebars show the link.
- Individual-student-utility risk: `2026-05-12-r141` adds a read-only finance/admin Excel export based on confirmed deducted attendance by lesson date; finance should confirm this is the Sales forecast utility definition they want before reminder automation is added.
- Package-balance-audit risk: `2026-05-13-r142` makes package ledger edit endpoints re-sync current remaining balance from ledger totals and adds audit views for balance mismatches plus risky rollback/adjustment rows; academic users should still validate abnormal corrections with ClassIn or attendance evidence before relying on corrected balances.
- Manager-quality-desk risk: `2026-05-13-r143` adds a manager-only daily reflection log stored in `AppSetting` plus read-only Lead Desk, feedback, report, and approval snapshots; it does not yet send reminders or OpenClaw messages, so managers still need to open the page themselves.
- Manager-print risk: `2026-05-13-r144` changes only Manager Quality Desk print rendering to a compact one-page Lead Desk table; operators should use browser print preview for unusually busy days because very high session counts may still need scaling.
- Ledger-confirmed-exception risk: `2026-05-15-r145` removes academically confirmed historical orphan rollback reversals from the active red ledger-integrity alert count; new unconfirmed mismatches and no-package deductions still need operator review.
- Transport-billing risk: `2026-05-15-r146` adds a parent transport reimbursement billing workflow that reuses parent invoice creation after Finance marks sessions billable; Finance must avoid marking normal campus lessons or lessons without parent agreement.
- Admin-sidebar-transport risk: `2026-05-15-r147` changes admin/manager navigation visibility only so managers can find transport billing and related finance document pages from the sidebar; it does not change billing permissions or transaction logic.
- Renewal-contract-history risk: `2026-05-16-r148` changes renewal contract signing so legacy package invoices no longer block the renewal flow; first-purchase contracts keep the multi-invoice ambiguity guard, and finance should still verify the newly generated renewal invoice after signing.
- Renewal-parent-info risk: `2026-05-17-r149` allows complete parent profiles on voided contracts to unlock renewal-contract creation; operators should still avoid reusing parent info if they voided the old contract specifically because the parent details were wrong.
- XDF-online-partial-closeout risk: `2026-05-19-r150` lets expired New Oriental online partner packages settle by full purchased minutes when remaining minutes were forfeited; active incomplete packages still remain blocked from settlement candidates.
- Tutor-payment-profile risk: `2026-05-27-r151` adds full PayNow details to finance payout exports, so finance users must treat generated CSV/XLSX files as sensitive payment data.
- Tutor-bank-payment-profile risk: `2026-05-27-r152` adds full bank account details to finance payout exports, so CSV/XLSX files now carry both PayNow and bank-transfer sensitive payment data.
- Manager-quality-history risk: `2026-05-27-r153` reads existing manager reflection entries into a dashboard and incomplete filter; because it does not change the saved reflection format, old entries should remain readable, but managers with no recent submissions will see empty dashboard states.
- Manager-quality-layout risk: `2026-06-12-r188` changes only the two-column alignment on the Manager Quality Desk reflection section; verify the daily reflection form stays content-height while the right-side quality snapshot still stacks normally.
- Student-package-utilization risk: `2026-06-17-r189` adds a read-only attendance-based extraction for shared packages; finance should use it for per-student usage splits and avoid using package ledger totals alone when siblings share the same package.
- Pre-approved-scheduling-exception risk: `2026-06-18-r190` adds required metadata only when staff manually exempt a direct-billing package from the invoice gate; scheduling still sees the same `EXEMPT` gate status, so ops must use the recorded approver/reason/follow-up fields to manage business risk outside the scheduler.
- Final-report-PDF-title-overlap risk: `2026-06-19-r191` changes only card-internal vertical spacing in final report PDFs; very dense reports still fit by shrinking body text, but bilingual titles should no longer sit on top of body content.
- Student-package-utilization-filename risk: `2026-06-22-r192` changes only the download filename fallback for the student package utilization Excel export; finance should retry the same export link after deploy, while preview totals and attendance detail rows remain unchanged.
- EduTrust-course-readiness risk: `2026-06-22-r193` adds nullable EduTrust course-profile metadata, a migration, and a new admin mapping page. Existing course names, class setup, packages, scheduling, attendance, contracts, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw behavior are intentionally unchanged; operators should treat the mappings as readiness metadata until course files, SSG contract mode, and C7 dashboards are added in later phases.
- EduTrust-course-file risk: `2026-06-22-r194` adds nullable Course File text fields for EduTrust Criterion 5 readiness and saves them from the existing `/admin/edutrust` page. These fields are readiness documentation only; they do not change live teaching delivery, lesson schedules, attendance deduction, packages, contracts, billing, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- SSG-contract-mode risk: `2026-06-22-r195` adds defaulted `StudentContract.contractMode` and an SSG Standard PEI-Student Contract v4.0 template/snapshot path. Existing contracts and normal contract creation remain on `TUITION_AGREEMENT`; no production UI currently creates SSG contracts yet, so this is a foundation only and should not affect signing, invoice creation, packages, scheduling, attendance, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.
- EduTrust-student-evidence risk: `2026-06-22-r196` adds nullable student-level EduTrust evidence records, a C7 outcomes workspace, a Section A/B evidence checklist, and a guarded SSG v4 contract creation entry. The SSG entry is available only for courses marked EduTrust, `PERMITTED`, `APPROVED`, and meeting minimum hours; normal tuition contracts remain default. This should not change scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.
- SSG-official-contract-template risk: `2026-06-22-r197` replaces the earlier SSG v4 summary shell with a locked official Standard PEI-Student Contract v4.0 template source extracted from TPGateway DOCX/PDF. System-filled values are intentionally limited to known fields; missing official Schedule values remain blank/placeheld. Normal tuition contracts and billing, scheduling, attendance, package balance, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw remain unchanged.
- EduTrust-contract-schedule-setup risk: `2026-06-22-r198` adds nullable course-level contract Schedule defaults and uses them to fill SSG Standard PEI-Student Contract v4.0 Schedule A-D values. SSG sign-link preparation now fails if required Schedule values are missing, so staff must complete `/admin/edutrust` Contract Schedule Setup before issuing new SSG contracts. Existing tuition contracts and normal billing, scheduling, attendance, package balance, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw remain unchanged.
- Manager-teacher-feedback risk: `2026-06-23-r199` adds a private manager-to-teacher quality feedback table and teacher acknowledgement view. Feedback is internal coaching data only; scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw remain unchanged.
- Manager-feedback-link-scroll risk: `2026-06-23-r200` changes only the Lead Desk `Give feedback / 给反馈` navigation target and form context hint so managers can see the selected session after clicking. Feedback storage, teacher acknowledgement, scheduling, attendance deduction, billing, payroll, and OpenClaw remain unchanged.
- Renewal-intake-parent-profile risk: `2026-06-23-r201` changes only the public intake guard for renewal contracts that are still waiting for parent profile data and have no reusable parent info saved. Renewal contracts that already have reusable parent info still show `No intake needed`, and formal signing, invoices, receipts, scheduling, attendance deduction, package balances, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw remain unchanged.
- Manager-feedback-selected-session-defaults risk: `2026-06-23-r202` changes only Manager Quality Desk feedback form defaults so the selected Lead Desk session controls the teacher and related-session dropdowns. Feedback storage, teacher acknowledgement, scheduling, attendance deduction, billing, payroll, and OpenClaw remain unchanged.
- Feedback-desk-bulk-overdue-forward risk: `2026-07-02-r203` removes and disables the broad Teacher Feedback Desk bulk overdue-forward action after real data showed it can convert missing/proxy overdue rows into final forwarded admin feedback in one batch. Existing feedback records are not changed; daily operators should use per-session proxy draft actions and Pending Forward marking instead.
- Resource-followup-CRM risk: `2026-05-28-r154` adds new Lead, LeadFollowUp, and LeadAssessmentRequest tables plus admin/teacher pages; conversion creates Student rows only after explicit admin action, and no billing, contract, package, attendance, payroll, or OpenClaw behavior is changed.
- Resource-owner-archive risk: `2026-05-28-r155` adds independent CRM owner records, reversible lead archive state, and a guarded test-resource deletion action; operators should only use physical deletion for known test data, while real inactive resources should be archived.
- Resource-followup-handoff risk: `2026-05-28-r156` adds quick resource filters, cancellable teacher assessments, and a prefilled Booking Link handoff only after conversion to Student; it does not change booking-link creation APIs, scheduling availability, billing, contracts, packages, payroll, attendance, or OpenClaw behavior.
- Resource-new-form-layout risk: `2026-05-28-r157` only constrains field widths on the new resource form so the owner selector cannot overlap the intent selector; no resource creation or downstream workflow logic is changed.
- Sales-CS-role risk: `2026-05-28-r158` adds new `SALES` and `CS` user roles and a scoped Resource Follow-up workspace; verify these users cannot enter full admin, finance, student, ticket, package, payroll, contract, or system-user pages.
- Admin-extra-workspace risk: `2026-05-29-r159` adds `UserWorkspaceAccess` so selected admins can use CS/Sales focused views while remaining `ADMIN`; verify Eva/Jasmine/zhao keep admin access and see only their configured extra workspace shortcuts.
- Workspace-access-form risk: `2026-05-29-r160` lets the owner manager edit Sales/CS focused workspace access from System User Admin; verify non-owner managers cannot write this endpoint and that main roles remain unchanged.
- Tutor-Wise-payment-profile risk: `2026-05-29-r161` removes Bank Transfer as a new tutor payment method and adds Wise details plus finance review status; finance should verify PayNow/Wise details before payout exports are used.
- Teacher-notice-attachment risk: `2026-05-30-r162` lets teachers open only the active Shared Docs file attached to an active teacher notice; verify the notice attachment is intentional before publishing because the full Shared Docs library remains manager/admin controlled.

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

## 2026-07-13-r239 Ready

- Scope: align the native miniapp with the official Boss/GTIA brand and make every staff search interaction consistent and resilient.
- Search behavior:
  - student scheduling, scheduling coordination, and assisted-ticket student lookup now share explicit query and clear controls
  - typing is debounced, keyboard search remains available, and a late response cannot overwrite a newer query
  - clearing a query immediately resets the correct result set; the student picker also clears any stale selected student
- Visual language:
  - official logo appears on parent and staff login pages
  - primary actions, navigation, and selected tabs use logo orange `#EC5E0A`
  - charcoal, white, and cool gray form the base palette; green/red remain limited to business status
  - staff-home rows use a cleaner divider layout instead of a stack of identical cards
- Copy: remove rollout and implementation wording such as travel, mobile-workbench, first-version, and availability labels from visible screens; replace it with direct operational labels.
- Safety: no API, permission, schedule, attendance, package, finance, notification, migration, or server-business change.
- Validation:
  - all miniapp JavaScript and JSON checks
  - `npm run miniapp:audit-release` with 26 pages and zero errors
  - 11 focused scheduling/teacher tests
  - `npx tsc --noEmit`
  - `npm run build` with 192 pages
  - WeChat DevTools compilation with 0 errors and 0 warnings
  - task doc: `docs/tasks/TASK-20260713-miniapp-ui-search-brand-refresh.md`
- Remaining before WeChat upload: run the three real-data searches and clear actions in an experience build on a physical phone; the DevTools remote employee request timed out during one final data-loading pass.

## 2026-07-13-r238 Ready

- Scope: add an isolated internal full-care workspace for selectable students, configurable service scope and owners, stage plans, evidence-based updates, risks, and tasks.
- Business impact:
  - ADMIN/manager users can create and configure care projects; assigned CARE staff can access only their project records.
  - Confirmed medical accompaniment, important transport, host-family support, holiday care, and visa/pass administration are selectable service scope and life-activity types.
  - Daily status confirmation and after-hours onsite support remain conditional and are not enabled by default.
  - Existing students, schedules, packages, attendance, partner settlement, payroll, invoices, receipts, Business Accounts, and parent miniapp behavior remain unchanged.
- Files:
  - `app/admin/care/*`
  - `lib/care-access.ts`
  - `lib/care-management.ts`
  - `lib/care-validation.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260713160000_add_care_management_core/migration.sql`
  - `tests/care-validation.test.ts`
  - `tests/care-migration-safety.test.ts`
- Verification before deploy:
  - `npx prisma validate`
  - `npx tsc --noEmit`
  - `npm run test:backend` with 45/45 passing
  - `npm run build` with 192 pages
  - read-only production baseline and protected-setting hashes saved
- Post-deploy verification:
  - confirm 102 migrations current, PM2 online, and `/admin/login` returns 200
  - compare the same teaching, package, settlement, billing, receipt, payroll-publish, and Business Accounts baseline
  - verify `/admin/care` renders for an authenticated ADMIN and no care project exists until manually created
  - verify existing student, package, partner settlement, and finance pages return successfully

## 2026-07-12-r234 Ready

- Scope: convert the tested miniapp source into a repeatable WeChat review build.
- Code: mock OpenIDs empty, base library pinned to 3.15.2, source maps disabled, production HTTPS and URL checking retained.
- Audit: add `npm run miniapp:audit-release` for AppID/config/page completeness and release-safety checks.
- Compliance: document actual data processing, unused sensitive APIs, privacy fields requiring owner input, and reviewer access using non-real test data.
- Operations: document upload, experience-version regression, audit submission, publishing, monitoring, Emily binding, and cleanup.
- Remaining external work: privacy contact/address/retention decisions plus WeChat backend basic-info, certification/filing, domain, and privacy-guide confirmation.
- Privacy intake update: contact and registered address are complete. Indefinite retention with optional super-admin deletion is recorded only as an initial preference; code inspection shows ticket files, finance history, and audit logs do not currently share a universal hard-delete path, so final retention wording still requires minimum-necessary periods and accounting classification.

## 2026-07-13-r235 Live

- Scope: give Jasmine/Eva/ADMIN a dedicated mobile list for students with usable active packages but no future lessons.
- Classification: distinguish true first scheduling from students who have historical lessons but need renewal scheduling.
- Workflow: reuse an open `排课要求 / 排课协调 / 新排课 / 补课加课` ticket or create one internal `新排课` ticket, then choose subject, level, teacher, campus, room, date, time, duration, and 1-12 weekly lessons.
- Permissions: CS/Emily can view the list and create/reuse a coordination ticket; only ADMIN can preview and confirm real Session writes.
- Safety: preserve package finance gates, balances, teacher qualifications, availability, all conflict checks, duplicate guards, signed ten-minute previews, second confirmation, serializable writes, ticket completion, audit logs, and parent notification behavior.
- Data evidence: read-only production evaluation reports 25 pending students: 5 first scheduling, 20 renewal scheduling, 24 ready, and 1 blocked.
- Validation: 27 related regressions, TypeScript, miniapp syntax, 22-page release audit, document sync, diff checks, and local/production 187-page builds pass. Production `ea1dcb8` has 101 migrations current, PM2 online, health 200, and one cron. Authenticated ADMIN GET reports 25/5/20/24/1 and write capability true; unauthenticated GET returns 401. Remaining external validation: WeChat DevTools re-open/compile and phone regression.

## 2026-07-13-r236 Live

- Decision: all students must be searchable and able to enter scheduling; the 25 students are an attention queue, not an eligibility list.
- Page: rename the entry to `学生排课` and add all, attention, first, renewal, already scheduled, and prerequisite-blocked filters.
- Existing schedules: students with future lessons stay visible and can create/reuse a `补课加课` Ticket.
- Missing prerequisites: students without a usable package can still enter coordination and receive a Ticket, but real Session creation remains blocked until package and finance rules pass.
- Validation: 28 focused regressions, TypeScript, miniapp syntax, the 22-page release audit, exact document sync, diff checks, and local/production 187-page builds pass. Production `0ba261c` is healthy with 101 migrations, one cron, and authenticated totals 88/25/15/34/39/46/42/4; scheduled scope and 401 boundary checks pass without production writes.
- Permissions: CS can coordinate only; ADMIN remains the only scheduling writer.
- Data evidence: read-only evaluation reports 88 total, 25 attention, 39 already scheduled, 46 ready, 42 requiring prerequisites, and 4 with reusable scheduling Tickets.
- Validation remaining: focused regressions, TypeScript, miniapp audit, full build, deploy, authenticated API, PM2/health/cron, and DevTools regression.

## 2026-07-12-r233 Live

- Scope: close the parent after-class feedback notification loop.
- Template decision: no dedicated template exists in category 590; use the semantically valid existing `服务完成通知`, with `课后反馈` as the service name, rather than misusing report or material templates.
- Event behavior: desktop and staff-miniapp teacher routes queue only the first publication for every student attached to the lesson.
- Consent behavior: parent home adds `开启课后反馈提醒`; invoice and feedback record the same official delivery ID but keep accepted and consumed intent separate.
- Staff behavior: web and mobile attention lists expose feedback rows waiting for consent.
- Safety: best-effort notification only, no feedback edit spam, no schema or business workflow change.
- Validation: TypeScript, nine mapping/student-resolution/consent-intent tests, miniapp/shell syntax, diff check, and local/production 186-page builds passed. Production `5dcd395` reports 8/8 configuration, group sizes 3/2/2/1, one cron, PM2 online, and health 200. No learning audit or feedback row existed before explicit consent. A marked test then sent as `SENT` under consent group `learning` with no failure/retry, and Zhao confirmed the WeChat card arrived normally.

## 2026-07-12-r232 Live

- Scope: make all four request/finance template authorizations independently visible and auditable.
- Evidence: the real parent audit recorded request `accept` and invoice `accept`, but finance and receipt were missing from the callback on repeated grouped attempts.
- Parent experience: keep the three-template course button, then show separate buttons for request status, unpaid, invoice, and receipt reminders.
- Safety: no server delivery, queue, business data, permission, or cron changes.
- Validation: miniapp JavaScript syntax, diff check, and local/production 186-page builds passed. Production `60fe07f` is healthy with 101 migrations current and one cron. Independent authorization produced accepted quota for all four templates; four marked test notifications each reached `SENT` with no retry or failure. Phone screenshots confirm all four cards and their expected fields rendered correctly in WeChat service notifications.

## 2026-07-12-r231 Live

- Scope: complete the request and finance WeChat subscription-message block.
- Business impact:
  - parents can authorize request/unpaid and invoice/receipt notifications in two clear groups
  - every parent-visible request status update can notify again instead of being suppressed after the first send
  - invoice creation queues invoice-issued and, when applicable, unpaid messages
  - receipt messages wait for the configured finance approval to complete
  - ADMIN/CS staff can find every due notification type that is still missing parent consent
- Safety boundaries:
  - exact-template consent quota is checked immediately before send
  - transient failures retry at most three times and messages older than seven days are skipped
  - notification failures do not roll back successful request, invoice, or receipt operations
  - no schema, course reminder, package, attendance, payment, payroll, or permission rule changes
- Validation before deploy:
  - TypeScript and full 186-page build
  - 6 WeChat subscription tests and 8 billing/approval regression tests
  - miniapp JavaScript/JSON, cron shell syntax, and diff checks
- Post-deploy checks:
  - production commit `f28c99d`, 101 migrations current, 186 pages built, PM2 online, and `/admin/login` 200
  - runtime configuration is 7/7; parent API returns configured group sizes 3, 2, and 2
  - ADMIN staff attention API returns 200 and currently exposes two request-status rows awaiting consent
  - exactly one cron includes the service sender; its automatic run scanned 2 and safely left both waiting for consent with no send, retry, failure, or skip
  - real parent authorization and controlled four-message display test remain the final external check

## 2026-07-11-r225 Live

- Scope: start the second mobile-operations phase while preserving existing desktop scheduling ownership and Ticket workflows.
- Business impact:
  - ADMIN can change the campus/online mode and room for one future Session only.
  - The original Class, historical Sessions, and all other future Sessions keep their original location.
  - ADMIN can schedule the same lesson weekly for 2-12 weeks; every week must pass package, availability, student, teacher, appointment, duplicate, and room checks before any Session is created.
  - Matching scheduling Tickets remain optional and can be completed in the same atomic series transaction.
  - Assigned teachers can submit a reason and preferred time from their own future lesson. The request creates or updates one internal `改课程时间` Ticket owned by Jasmine and visible to Eva/management in the existing mobile board.
  - The notification admin page reports AppID/Secret and five template-ID configuration states. Parent reminder buttons appear only for configured template groups and record the result of `wx.requestSubscribeMessage`.
- Safety boundaries:
  - No location change for started/attended/deducted Sessions.
  - No partial weekly scheduling, more than 12 weeks, teacher direct schedule writes, or automatic Ticket completion for teacher requests.
  - Subscription consent storage is enabled, but outbound WeChat sending remains blocked until official template IDs and template-field mappings are completed.
- Verification before deploy:
  - `npx tsc --noEmit`, miniapp syntax/WXML, `git diff --check`, and `npm run build`
  - local route checks: 401 unauthenticated, 200 valid previews/reads, 409 invalid applies, unchanged database snapshots
  - configuration check currently reports 0/5 WeChat template IDs
- Post-deploy verification:
  - deployed feature commit `b09147b`; PM2 is online and `/admin/login` returns 200
  - location options and valid preview return 200; invalid apply returns 409
  - valid two-week series preview returns 200; invalid apply returns 409
  - teacher-owned request GET returns 200; invalid student POST returns 409 and Ticket count remains unchanged
  - parent subscription configuration GET returns 200 and all groups remain unconfigured/hidden with 0/5 template IDs
  - no `MINIAPP_SESSION_CHANGE_LOCATION`, `MINIAPP_SESSION_SERIES_CREATE`, or teacher-request audit writes were created by verification

## 2026-07-11-r224 Live

- Scope: finish the first mobile academic-operations batch without requiring staff to return to the desktop for common single-lesson changes.
- Business impact:
  - Scheduling Ticket detail lists the student's next 30 lessons and opens lesson detail directly.
  - ADMIN can process future leave/cancellation with an explicit charge/no-charge choice and optionally complete matching `临时取消&请假课程` Tickets.
  - ADMIN can replace the qualified teacher for one future Session and optionally complete matching `改上课老师` Tickets; the Class default teacher and other Sessions do not change.
  - `新排课`, `补课加课`, and `排课协调` Tickets can create a first one-on-one Session without an existing lesson anchor.
  - Legacy Tickets with no `studentId` are resolved only when `studentName` has exactly one Student match; ambiguous names remain blocked.
  - Create/reschedule closure matching now respects the action's Ticket types instead of only the exact `排课协调` type.
- Safety boundaries:
  - ADMIN-only writes, future lessons only, single Session only, 10-minute signed previews, and SERIALIZABLE transaction revalidation.
  - No batch future-series edits, Class default-teacher changes, automatic charge choice, finance writes, payroll writes, or OpenClaw changes.
  - Existing attendance or package-deduction evidence blocks cancellation or teacher replacement.
- Verification before deploy:
  - `npx tsc --noEmit`
  - miniapp JavaScript/WXML checks and `git diff --check`
  - `npm run build`
  - read-only production-data previews and token tamper checks for all three write workflows
- Post-deploy verification:
  - deployed code commit `888a0a9`; PM2 is online and `/admin/login` returns 200
  - unauthenticated first-scheduling, cancellation, and teacher-replacement endpoints return 401
  - authenticated valid real-data previews return 200 for all three workflows
  - invalid apply tokens return 409 `PREVIEW_REQUIRED`; first-scheduling Ticket/session count and cancellation Attendance/package-ledger snapshots remain unchanged
  - teacher replacement listed 15 qualified candidates and previewed Yunfeng successfully without applying the change
  - release documentation and the persistent miniapp plan were synchronized after production verification

## 2026-07-11-r223 Ready

- Scope: make the 13-item mobile scheduling queue assignable and expose its existing `Need Info` work explicitly.
- Business impact:
  - The board adds a `待补信息` filter and summary count; production currently has 3 matching Tickets.
  - Detail adds an owner selector for unassigned, Jasmine, Eva, and Emily.
  - Owner changes are written with the communication/status/follow-up update and audit record in one transaction.
  - Existing state-transition rules remain unchanged; this release does not complete Tickets or write Sessions.
- Verification before deploy:
  - authenticated `Need Info` filter returns 3 production Tickets
  - detail returns four allowed owner options
  - invalid owner returns 409 and leaves Ticket unchanged
  - `npx tsc --noEmit`
  - miniapp JavaScript checks
  - `npm run build`
- Post-deploy verification:
  - ADMIN board summary reports `needInfo=3`
  - invalid owner PATCH remains 409/no-write
  - PM2, `/admin/login`, and commit alignment checks

## 2026-07-11-r222 Live

- Scope: fix the misleading mobile count caused by filtering only the exact `排课协调` Ticket type.
- Business impact:
  - The board now includes `排课协调`, `改课程时间`, `新排课`, `补课加课`, `临时取消&请假课程`, and `改上课老师`.
  - Production reconciliation changes the open board count from 1 to 13 without changing or reclassifying any Ticket data.
  - Each card and detail header displays the original Ticket type so staff can distinguish the workflow.
  - Archived, completed, cancelled, and non-scheduling Tickets remain outside the open scheduling board.
- Verification before deploy:
  - production read-only reconciliation: 428 total, 414 archived, 13 open scheduling-related Tickets
  - authenticated local production-data API returns all 13 with exact per-type counts
  - `npx tsc --noEmit`
  - miniapp syntax/JSON checks
  - `npm run build`
- Post-deploy verification:
  - authenticated ADMIN board returns `totalOpen=13`
  - returned per-type counts match production database
  - unauthenticated access remains 401

## 2026-07-11-r221 Live

- Scope: give Eva/Jasmine one mobile queue for all open scheduling-coordination work instead of requiring entry through an individual lesson.
- Business impact:
  - The staff home shows open and overdue coordination counts for permitted roles.
  - The board supports all-open, overdue, waiting-parent, waiting-teacher, confirmed, and exception views, plus owner filtering and student/course/ticket search.
  - Detail supports communication target/result, valid status transitions, next action, follow-up date, history, and copying the active parent availability link.
  - Teachers cannot access the board. Completion remains inside the signed mobile scheduling confirmation workflow.
- Files:
  - `lib/miniapp-scheduling-coordination-board.ts`
  - `app/api/miniapp/staff/scheduling-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/*`
- Verification before deploy:
  - `npx tsc --noEmit`
  - miniapp JavaScript and JSON checks
  - authenticated real-data list/detail reads
  - invalid PATCH/no-write verification
  - permission and unauthenticated checks
  - `npm run build`
- Post-deploy verification:
  - ADMIN list/detail return 200 and summary matches production open Tickets
  - unauthenticated access returns 401
  - invalid PATCH returns 409 without changing the Ticket
  - PM2, `/admin/login`, and commit alignment checks

## 2026-07-11-r220 Live

- Scope: remove duplicate follow-up work after Eva/management finishes a mobile scheduling operation by optionally completing matching scheduling-coordination Tickets at final confirmation.
- Business impact:
  - A successful conflict preview lists only open `排课协调` Tickets for the same lesson students and matching course.
  - No Ticket is selected by default. ADMIN staff explicitly choose which resolved Tickets to complete before the final scheduling confirmation.
  - Session creation/rescheduling, Ticket completion, parent-availability-link deactivation, final result, completion identity, and audit records are committed atomically.
  - Parent-visible completed Tickets enter the existing notification outbox; internal-only Tickets do not notify parents.
- Files:
  - `lib/miniapp-session-scheduling.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/manage/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
- Verification before deploy:
  - `npx tsc --noEmit`
  - miniapp JavaScript and affected WXML checks
  - signed-preview eligible Ticket checks
  - read-only real-data preview and no-write route checks
  - `npm run build`
- Post-deploy verification:
  - authenticated ADMIN preview returns 200 and only matching open Ticket candidates
  - unpreviewed Ticket selection returns 409 without changing Session or Ticket
  - PM2, `/admin/login`, and commit alignment checks

## 2026-07-11-r219 Live

- Scope: let Eva and management schedule an additional same-class lesson or reschedule one future lesson from the staff miniapp with mandatory conflict preview and confirmation.
- Business impact:
  - ADMIN staff can choose date, time, and duration from lesson detail, then run a no-write conflict check before confirming the operation.
  - The new lesson keeps the current class, effective teacher, campus, and room; rescheduling changes only the selected lesson's time and duration.
  - Apply requires a short-lived signed preview token and rechecks student, teacher, appointment, room, availability, package, duplicate, attendance-lock, and future-time rules.
  - CS, teachers, finance, and sales cannot call the scheduling-write route. No package ledger, attendance deduction, billing, receipt, payroll, or OpenClaw behavior changes.
- Files:
  - `lib/miniapp-session-scheduling.ts`
  - `lib/miniapp-staff-session.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/manage/route.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
- Verification before deploy:
  - `npx tsc --noEmit`
  - permission, signed-preview, tamper, real-data preview, and missing-preview rejection checks
  - miniapp JavaScript/JSON and affected WXML checks
  - `npm run build`
- Post-deploy verification:
  - authenticated ADMIN preview returns 200 without changing a Session
  - apply without a valid preview token returns 409
  - PM2, `/admin/login`, and commit alignment checks

## 2026-07-11-r218 Ready

- Scope: make staff lesson detail role-aware and add a mobile scheduling-coordination communication workflow backed by the existing Ticket and parent-availability-link models.
- Business impact:
  - 教务/管理 can select a lesson student, record who was contacted and the result, set the coordination status/next action/follow-up date, and copy the parent availability link.
  - An open Ticket for the same student and course is reused; otherwise a formal `排课协调` Ticket and parent availability request are created.
  - Teachers continue to see only assigned-lesson attendance and feedback tools. Other staff can read lesson detail but do not receive coordination-write access unless their role/workspace permits it.
  - Final rescheduling writes, attendance deduction, package balances, finance, receipts, payroll, and OpenClaw remain unchanged.
- Files:
  - `lib/miniapp-staff-session.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/route.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/coordination/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
- Verification before deploy:
  - `npx tsc --noEmit`
  - role-capability and authenticated GET-route smoke checks
  - read-only real lesson-detail check
  - miniapp JavaScript/JSON and affected WXML checks
  - `npm run build`
- Post-deploy verification:
  - PM2 process and `/admin/login` health checks
  - unauthenticated lesson-detail route returns 401
  - local/origin/server commit alignment

## 2026-07-11-r217 Ready

- Scope: formalize parent-request visibility, public summary, internal note, communication source, assisted-entry identity, and parent-facing completion result on Ticket records.
- Business impact:
  - Emily's WeChat-group-assisted requests now keep internal original notes and parent-facing content as independent data, while parents remain restricted to the external summary, status, next action, and completion result.
  - Existing `家长小程序` Tickets receive a best-effort backfill and keep legacy text fallbacks, so historic request visibility is preserved.
  - Scheduling, attendance deduction, package balances, finance, receipts, payroll, normal Ticket Center flows, and OpenClaw behavior are intentionally unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260711103000_add_parent_request_visibility_fields/migration.sql`
  - `lib/miniapp-parent-requests.ts`
  - `app/api/miniapp/staff/parent-requests/*`
  - `app/api/miniapp/students/[studentId]/requests/route.ts`
  - `app/api/admin/ops/parent-requests/[id]/route.ts`
- Verification before deploy:
  - `npx prisma generate`
  - `npx tsc --noEmit`
  - miniapp JavaScript/JSON and request-detail WXML checks
  - formal-field and legacy-summary DTO compatibility smoke check
  - `npm run build`
- Post-deploy verification:
  - `npx prisma migrate status` on the server
  - PM2 process and `/admin/login` health checks
  - local/origin/server commit alignment

## 2026-07-10-r213 Ready

- Scope: fix student monthly schedule PDF exports to show the per-session replacement teacher when a lesson has been changed from the class default teacher.
- Business impact:
  - Student detail pages already showed replacement teachers correctly; exported student schedule PDFs now match that same rule.
  - The reported 2026-07-12 王钰澄 lesson has class teacher Jasmine and session teacher Zoe, so the export should show Zoe.
  - Scheduling writes, teacher replacement history, attendance deduction, package balances, payroll, billing, partner settlement, miniapp, and OpenClaw flows are intentionally unchanged.
- Files:
  - `app/api/exports/student-schedule/[id]/route.ts`
  - `lib/student-schedule-export.ts`
  - `tests…57965 tokens truncated…erm-report logic, attendance/deduction logic, package balance logic, or finance logic changed
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

## 2026-07-13-r237 Live

- Scope: add the complete first teacher-mobile workbench for own availability, leave/reschedule requests, personal expenses, and monthly teaching history.
- Permission: every new endpoint requires a TEACHER role and linked teacher profile; management users and unauthenticated callers cannot enter the teacher-only APIs.
- Reuse: availability, Ticket, ExpenseClaim, upload storage, audit, approval/payment, Session, attendance, and feedback data all remain in their existing system of record.
- Safety: leave/reschedule creates or updates a coordination Ticket only; expense submission never grants approval/payment rights; teaching history excludes payroll amounts.
- Data evidence: 46 linked teacher accounts are eligible, with 179 future-30-day sessions, 107 current-month completed sessions, 664 future availability slots, and existing teacher expense records available. Active teacher miniapp bindings remain 0 until rollout.
- Validation: 28 focused tests, TypeScript, miniapp syntax, 26-page audit, exact document sync, diff checks, read-only reconciliation, and local/production 191-page builds pass. Production `fc0ee9f` has 101 migrations, PM2 online, health 200, and one cron; all four teacher endpoints return ADMIN 403 and anonymous 401, while ADMIN schedule remains 200. First bound-teacher phone regression remains.
