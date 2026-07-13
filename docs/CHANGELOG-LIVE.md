Warning: truncated output (original token count: 127520)
Total output lines: 8536

# CHANGELOG LIVE

This file is the single source of truth for what changed in production.

## Entry Template

- Release ID:
- Date/Time (Asia/Shanghai):
- Deployment status:
- Scope:
- Key files:
- Risk impact (if any):
- Verification:
- Rollback point:

---

## 2026-07-13-r240

- Release ID: `2026-07-13-r240`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE`
- Scope: repair the full-care detail-page Server Action boundary discovered while producing the operator SOP, add a focused regression guard, and publish the complete 20-page full-care training SOP with real annotated system screenshots.
- Key files:
  - `app/admin/care/[id]/page.tsx`
  - `tests/care-server-action-safety.test.ts`
  - `package.json`
  - `docs/SOP-教务-全托管工作台完整操作流程-培训版-20260713.html`
  - `docs/assets/sop-教务-全托管工作台完整操作-20260713/annotated/*`
  - `docs/全托管业务系统总体规划-20260713.md`
  - `docs/tasks/TASK-20260713-full-care-action-safety-and-sop.md`
- Risk impact (if any): Low and isolated. The runtime change only moves the care action redirect/error helper outside the page component so Next.js can serialize each Server Action. It does not change schemas, permissions, service validation, page layout, scheduling, attendance, packages, partner settlement, payroll, invoices, receipts, or existing finance data.
- Verification: TypeScript, 46 backend tests, and the full 192-page production build pass. A production-mode Playwright flow used a temporary student and care project to submit status activation, configuration save, stage plan, HIGH-risk parent-summary update, automatic linked task creation, and DONE completion evidence; persisted values matched expectations. Cleanup was verified at zero temporary students, sessions, engagements, plans, activities, and tasks. The SOP renders as 20 A4 landscape pages (2.33 MB); visual contact-sheet review and key-text extraction pass.
- Rollback point: web production commit `f6b5519`; immediate Git parent `327f8aa` contains only the already-prepared native-miniapp source refresh on top of r238.
- Production commit: `caa9cbda565bfe607e2c8b6b4e82b3c4a15e5340`.
- Deployment result: backup `tuition-scheduler_2026-07-13_181341.dump` completed; 102 migrations are current; the 192-page production build passed; PM2 is online with zero restarts; `/admin/login` returns `200`; unauthenticated `/admin/care` redirects to login; pre/post teaching, package, partner-settlement, and protected-finance baselines match exactly; all four full-care business tables remain empty.

---

## 2026-07-13-r239

- Release ID: `2026-07-13-r239`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `READY`
- Scope: refresh the native miniapp visual language around the official Boss/GTIA logo, remove internal rollout-style copy, and repair all three staff search experiences so typing, keyboard confirmation, explicit query, clearing, and overlapping requests behave consistently.
- Key files:
  - `miniapp/boss-academic-parent/assets/boss-logo.png`
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/app.wxss`
  - `miniapp/boss-academic-parent/pages/**/*.{wxml,wxss,js}`
  - `miniapp/boss-academic-parent/README.md`
  - `scripts/audit-miniapp-release.ts`
  - `docs/tasks/TASK-20260713-miniapp-ui-search-brand-refresh.md`
  - `docs/小程序与家长端全程托管规划-20260709.md`
- Risk impact (if any): Low and client-side only. This release does not change APIs, permissions, schedules, attendance, packages, finance, notifications, database schema, or server business logic. The main remaining risk is visual/interaction variance on physical WeChat devices; employee data could not be reloaded during one DevTools pass because the existing remote request timed out, so experience-version search regression remains required before upload.
- Verification: all miniapp JavaScript syntax and JSON parsing pass; the 26-page release audit passes with AppID, production HTTPS, logo-orange navigation, standard search controls, stale-request protection, mock login off, URL checking on, source maps off, and zero errors; 11 focused scheduling/teacher tests, TypeScript, the full 192-page production build, diff checks, and WeChat DevTools compilation with 0 errors/0 warnings pass. Login visual inspection confirms the official logo and orange/charcoal/gray palette render correctly.
- Rollback point: `2026-07-13-r238` (`f6b5519`).

---

## 2026-07-13-r238

- Release ID: `2026-07-13-r238`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE`
- Scope: add the isolated internal full-care workspace for selectable students, service scope, responsibility team, stage plans, evidence-based updates, risk controls, and tasks without changing teaching or finance workflows.
- Key files:
  - `app/admin/care/*`
  - `lib/care-access.ts`
  - `lib/care-management.ts`
  - `lib/care-validation.ts`
  - `prisma/migrations/20260713160000_add_care_management_core/migration.sql`
  - `tests/care-validation.test.ts`
  - `tests/care-migration-safety.test.ts`
  - `docs/tasks/TASK-20260713-full-care-core-workspace.md`
  - `docs/全托管业务系统总体规划-20260713.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium and isolated. The migration adds only CARE enums, workspace access, five new care tables, foreign keys, and indexes. The care service never writes packages, package transactions, sessions, attendance, partner settlement, payroll, invoices, receipts, or Business Accounts. Parent publication and automatic pilot-student activation are not included.
- Verification: Prisma validate, TypeScript, 45 backend regressions, migration non-intrusion assertions, diff checks, exact planning-document sync, and two full 192-page production builds pass. Read-only production baseline records 88 students, 78 packages, 1895 sessions, 1704 attendances, 34 partner settlements, package/ledger minute and amount totals, plus hashes of protected billing, receipt, payroll-publish, and Business Accounts settings. The new migration is confirmed pending before deploy.
- Rollback point: production commit `7ebbbc68eda4237d5be045d3e3bdc645b5bd64c6` before `2026-07-13-r238`.

---

## 2026-07-13-r237

- Release ID: `2026-07-13-r237`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE`
- Scope: add a role-specific teacher mobile workbench to the native miniapp with future availability maintenance, leave/reschedule entry, personal expense submission/status, and monthly teaching history, while preserving the existing own-schedule, attendance, and feedback workflow.
- Key files:
  - `app/api/miniapp/staff/teacher/*`
  - `lib/miniapp-teacher-workbench.ts`
  - `miniapp/boss-academic-parent/pages/staff-teacher-*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `tests/miniapp-teacher-workbench.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-teacher-mobile-workbench.md`
- Risk impact (if any): Medium and constrained. Teacher endpoints require a TEACHER staff session with a linked teacher profile. Availability writes are limited to the teacher's own next 30 days; leave/reschedule remains a Ticket and never changes a Session directly; expenses remain the teacher's own claims and preserve existing file, duplicate, audit, approval, and payment rules; history is read-only and excludes payroll amounts.
- Verification: 28 focused teacher/scheduling/conflict/auth/notification tests, TypeScript, all miniapp JavaScript syntax, the 26-page release audit, exact planning-document sync, diff checks, read-only real-data reconciliation, and local/production 191-page builds pass. Production deployed at `fc0ee9f` with 101 migrations current, PM2 online, health 200, and one reminder cron. ADMIN gets 403 and unauthenticated callers get 401 from all four teacher-only read endpoints, while the existing ADMIN staff-schedule endpoint remains 200. No teacher session or business write was created because active teacher miniapp bindings remain 0.
- Rollback point: `2026-07-13-r236`.

---

## 2026-07-13-r236

- Release ID: `2026-07-13-r236`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE`
- Scope: change the staff-miniapp scheduling center from a restricted 25-student attention list into an all-student scheduling entry, while retaining the 25 students as an operational attention filter rather than an eligibility rule.
- Key files:
  - `lib/miniapp-first-scheduling.ts`
  - `app/api/miniapp/staff/first-scheduling/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-first-scheduling/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `tests/miniapp-first-scheduling.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-all-student-scheduling.md`
- Risk impact (if any): Medium and constrained. All students become visible and can enter coordination, including students with existing future lessons or missing packages. Final Session writes still require ADMIN permission and the unchanged package, finance gate, qualification, availability, conflict, duplicate, preview-token, second-confirmation, and transaction checks. Creating a coordination Ticket does not bypass scheduling prerequisites.
- Verification: 28 focused scheduling/conflict/auth/notification tests, TypeScript, miniapp JavaScript syntax, the 22-page release audit, exact planning-document sync, diff checks, and local/production 187-page builds pass. Production deployed at `0ba261c` with 101 migrations current, PM2 online, health 200, and exactly one reminder cron. Authenticated ADMIN GET reports 88 total, 25 attention, 15 first, 34 renewal, 39 scheduled, 46 ready, 42 requiring prerequisites, 4 reusable Tickets, and `canSchedule=true`; the scheduled scope returns an existing future-course student and unauthenticated GET returns 401. No production Ticket or Session was created during verification.
- Rollback point: `2026-07-13-r235`.

---

## 2026-07-13-r235

- Release ID: `2026-07-13-r235`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE`
- Scope: add a complete staff-miniapp scheduling center for students who have usable active packages but no future lessons, distinguish first scheduling from renewal scheduling, repair the `排课要求` ticket-category gap, and allow an ADMIN to create one or 1-12 weekly lessons through the existing preview/confirmation engine.
- Key files:
  - `lib/miniapp-first-scheduling.ts`
  - `lib/miniapp-ticket-new-session.ts`
  - `lib/miniapp-scheduling-coordination-board.ts`
  - `app/api/miniapp/staff/first-scheduling/route.ts`
  - `app/api/miniapp/staff/scheduling-coordination/[ticketId]/new-session/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-first-scheduling/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `tests/miniapp-first-scheduling.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-first-scheduling-center.md`
- Risk impact (if any): High but constrained. This release creates real Classes, Enrollments, Sessions, Ticket completion records, and AuditLogs only after ADMIN preview and second confirmation. CS can find students and create/reuse a scheduling ticket but cannot write lessons. Existing package finance gates, balance checks, teacher qualification/availability, student/teacher/room conflict checks, duplicate protection, serializable transactions, request notifications, and course reminder cron remain authoritative.
- Verification: 27 focused scheduling/auth/notification regression tests, TypeScript, miniapp JavaScript syntax, release audit with 22 complete pages, exact planning-document sync, diff checks, and local/production 187-page builds pass. Production deployed at `ea1dcb8` with 101 migrations current, PM2 online, health 200, and exactly one reminder cron. Authenticated ADMIN GET returns 200 with total 25, first 5, renewal 20, ready 24, blocked 1, one returned row for `limit=1`, and `canSchedule=true`; the same endpoint without a staff token returns 401. No production Ticket or Session was created during verification.
- Rollback point: `2026-07-12-r234`.

---

## 2026-07-12-r234

- Release ID: `2026-07-12-r234`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `READY`
- Scope: harden the native miniapp for WeChat review by disabling tracked mock login, pinning the verified base library, disabling source-map upload, adding a repeatable release audit, and producing the privacy/reviewer/upload/submission checklist for version 1.0.0.
- Key files:
  - `miniapp/boss-academic-parent/utils/config.js`
  - `miniapp/boss-academic-parent/project.config.json`
  - `miniapp/boss-academic-parent/README.md`
  - `scripts/audit-miniapp-release.ts`
  - `docs/小程序正式发布准备与审核清单-20260712.md`
  - `docs/tasks/TASK-20260712-miniapp-release-readiness.md`
- Risk impact (if any): Low. This release changes miniapp packaging/review defaults and documentation only. Production API, parent/staff authentication, business routes, database, notification delivery, and server runtime are unchanged. Developers must explicitly make any temporary local mock change and restore it before upload.
- Privacy intake: contact owner, email, phone, and registered address are confirmed. The owner's initial indefinite-retention preference is recorded but is not approved as submitted wording because code review found no universal physical-file/finance/audit hard-delete path; minimum-necessary business/upload periods and accounting-record classification remain release gates.
- Verification: automated release audit passes with AppID correct, 21 complete pages, base library 3.15.2, production HTTPS API, URL checking on, source maps off, mock login off, and zero errors. Miniapp JavaScript/JSON syntax, TypeScript, diff checks, exact planning-document sync, and the full 186-page production build also pass. Experience-version parent/staff regression remains after upload.
- Rollback point: `2026-07-12-r233`.

---

## 2026-07-12-r233

- Release ID: `2026-07-12-r233`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: notify parents when a teacher first publishes after-class feedback from either desktop or staff miniapp, with an independent parent authorization action and explicit consent-intent accounting despite sharing the official service-completion template with invoices.
- Key files:
  - `lib/miniapp-feedback-notification.ts`
  - `lib/wechat-miniapp-service-subscription.ts`
  - `lib/miniapp-subscription-config.ts`
  - `lib/miniapp-reminder-attention.ts`
  - `app/api/teacher/sessions/[id]/feedback/route.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/feedback/route.ts`
  - `miniapp/boss-academic-parent/pages/home/home.js`
  - `scripts/send-miniapp-service-notifications.ts`
  - `tests/wechat-miniapp-subscription.test.ts`
  - `docs/tasks/TASK-20260712-miniapp-feedback-published-notification.md`
- Risk impact (if any): Medium and constrained. Only the first feedback publication queues a message; edits do not notify again. Student resolution covers direct, one-to-one, and enrolled class students, while parent delivery remains permission- and consent-gated. Invoice and feedback share one official template ID but keep separate consent-intent buckets, preventing invoice authorization from silently enabling feedback delivery.
- Verification: official category and keyword APIs were checked; no dedicated feedback template exists and duplicate addition of `服务完成通知` was rejected as already added. TypeScript, nine mapping/student-resolution/consent-intent tests, miniapp and shell syntax, diff check, and local/production 186-page builds passed. Production deployed at `5dcd395` with 101 migrations current, PM2 online, health 200, one cron, and 8/8 configured entries across groups sized 3, 2, 2, and 1. Before authorization there was no learning audit or feedback outbox row. After explicit learning consent, one marked feedback test sent as `SENT` with consent group `learning`, no retry/failure, and no invoice-consent use; Zhao confirmed the WeChat card arrived and displayed normally.
- Rollback point: `2026-07-12-r232`.

---

## 2026-07-12-r232

- Release ID: `2026-07-12-r232`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: split request, unpaid, invoice, and receipt subscription authorization into four explicit one-template actions after real-phone evidence showed WeChat returned only the first template from each two-template group.
- Key files:
  - `miniapp/boss-academic-parent/pages/home/home.js`
  - `docs/tasks/TASK-20260712-miniapp-request-finance-notifications.md`
  - `docs/小程序与家长端全程托管规划-20260709.md`
- Risk impact (if any): Low. Delivery, template IDs, backend consent audit, queueing, finance/request writes, and cron behavior are unchanged. The parent now makes one clear click per service template so the WeChat result is unambiguous.
- Verification: production consent audit first showed request and invoice `accept` while finance and receipt were absent from grouped callbacks. After the split UI, the test parent recorded request 4, unpaid 1, invoice 2, and receipt 1 accepted quotas. Miniapp syntax, diff check, and local/production 186-page builds passed; production deployed at `60fe07f` with 101 migrations current, one cron, PM2 online, and health 200. Four clearly marked test outbox rows then sent successfully through the production sender with `SENT` 4, retry 0, failure 0, and skip 0; two unrelated no-consent rows remained waiting. Zhao supplied phone screenshots confirming all four WeChat service notifications rendered with the expected request, deadline, invoice, student, amount, account, and date fields.
- Rollback point: `2026-07-12-r231`.

---

## 2026-07-12-r231

- Release ID: `2026-07-12-r231`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: complete official WeChat subscription notifications for parent-visible request status changes, unpaid invoices, issued invoices, and finance-approved receipts; add grouped parent consent actions, bounded delivery, and shared staff consent-attention monitoring.
- Key files:
  - `lib/wechat-miniapp-service-subscription.ts`
  - `scripts/send-miniapp-service-notifications.ts`
  - `lib/student-parent-billing.ts`
  - `lib/parent-receipt-approval.ts`
  - `lib/miniapp-reminder-attention.ts`
  - `app/api/admin/ops/parent-requests/[id]/route.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/route.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/*`
  - `app/api/miniapp/staff/scheduling-coordination/[ticketId]/*`
  - `ops/server/scripts/setup_miniapp_course_reminder_cron.sh`
  - `tests/wechat-miniapp-subscription.test.ts`
  - `docs/tasks/TASK-20260712-miniapp-request-finance-notifications.md`
- Risk impact (if any): Medium and constrained. Business events only enqueue best-effort notifications for active linked parents with matching permissions. Delivery requires unused consent for the exact official template, claims rows before sending, retries transient failures at most three times, and skips stale rows after seven days. Receipt messages require completed finance approval. No schema or existing business write rule changes.
- Verification: TypeScript, six WeChat mapping/quota tests, eight billing/approval regression tests, miniapp syntax, cron shell syntax, diff check, and a full 186-page build passed locally and in production. Production deployed at `f28c99d`; runtime reports 7/7 templates and parent API reports configured groups of 3 course, 2 request/finance, and 2 document templates. ADMIN staff API returns 200 with two current request notifications awaiting consent. Exactly one cron is installed; its automatic service run scanned 2, correctly left 2 waiting for consent, and recorded zero sends, retries, failures, or skips. PM2 is online and `/admin/login` returns 200. Real-parent authorization and controlled display tests remain the external follow-up.
- Rollback point: `2026-07-12-r230`.

---

## 2026-07-12-r230

- Release ID: `2026-07-12-r230`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: show family-shared course-reminder quota and next-three-lesson coverage to parents, add a natural reauthorization action on the schedule, and expose due reminders without consent to admin and permitted staff mobile users.
- Key files:
  - `lib/wechat-miniapp-subscription.ts`
  - `lib/miniapp-course-reminder-coverage.ts`
  - `lib/miniapp-reminder-attention.ts`
  - `app/api/miniapp/subscriptions/intent/route.ts`
  - `app/api/miniapp/staff/reminder-attention/route.ts`
  - `app/api/admin/miniapp-notifications/route.ts`
  - `app/admin/miniapp-notifications/MiniappNotificationsClient.tsx`
  - `miniapp/boss-academic-parent/pages/home/*`
  - `miniapp/boss-academic-parent/pages/schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-reminder-attention/*`
  - `tests/wechat-miniapp-subscription.test.ts`
  - `docs/tasks/TASK-20260712-miniapp-reminder-coverage-and-attention.md`
- Risk impact (if any): Low to medium and read-focused. Quota and coverage are derived from existing consent audits, successful sends, linked students, and future Sessions. The new staff list is read-only and restricted to ADMIN, CS, or active CS-workspace users. Sending, scheduling, package, attendance, finance, Ticket, and payroll writes are unchanged.
- Verification: TypeScript, four quota/mapping tests, miniapp JavaScript/JSON syntax, diff check, and full production build passed. Production deployed at `3ffa260` with 101 migrations current and 186 pages built. Parent and permitted-staff production APIs both return 200; the test parent reports 8 accepted, 4 consumed, 4 available and the test Session as `SENT`; staff attention total is 0. PM2 is online, `/admin/login` returns 200, and exactly one reminder cron remains installed.
- Rollback point: `2026-07-12-r229`.

---

## 2026-07-12-r229

- Release ID: `2026-07-12-r229`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: recover automatic course reminders when deploy cleanup removes the untracked cron log directory.
- Key files:
  - `ops/server/scripts/setup_miniapp_course_reminder_cron.sh`
  - `ops/server/scripts/deploy_app.sh`
  - `docs/tasks/TASK-20260712-miniapp-reminder-cron-log-recovery.md`
- Risk impact (if any): Low. The cron creates its log directory before redirection and is idempotently reinstalled after deploy. Reminder timing, consent, mapping, retries, and business data are unchanged.
- Verification: shell syntax and diff checks passed; production deployed at `b8f2426`; PM2 is online and `/admin/login` returns 200. Deployment reinstalled exactly one reminder cron and recreated `ops/logs`. Without a manual queue or sender call, the `12:10` cron scanned 13 sessions, queued exactly 1 dedicated test reminder, sent it successfully at `12:10:08`, and persisted `SENT` with no retry, failure, or skip.
- Rollback point: `2026-07-12-r228`.

---

## 2026-07-12-r228

- Release ID: `2026-07-12-r228`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: bundle three legitimate one-time course templates into one parent authorization action and consume their quotas independently across future lessons.
- Key files:
  - `lib/miniapp-subscription-config.ts`
  - `lib/wechat-miniapp-subscription.ts`
  - `scripts/queue-miniapp-course-reminders.ts`
  - `scripts/send-miniapp-course-reminders.ts`
  - `ops/server/scripts/deploy_app.sh`
  - `tests/wechat-miniapp-subscription.test.ts`
  - `docs/tasks/TASK-20260712-three-template-course-reminder-bundle.md`
- Risk impact (if any): Medium and constrained. Three official course templates are requested together, but each accepted quota is counted and consumed separately. Existing 24-hour timing, stale-window, retry, and deduplication rules remain unchanged.
- Verification: exact WeChat fields fetched from the account; three mapping tests, TypeScript, shell syntax, diff check, and full build passed; production deployed at `884e945`; runtime reports 3 configured course templates, joint label `开启未来 3 节课提醒`, one cron entry, PM2 online, and `/admin/login` 200. Real-phone preview returned `accept` for all three template IDs; after the earlier smoke send, the test parent has 7 accumulated course-message quotas available.
- Rollback point: `2026-07-12-r227`.

---

## 2026-07-12-r227

- Release ID: `2026-07-12-r227`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: automatically queue and send verified 24-hour WeChat course reminders with terminal-state deduplication, consent-quota gating, bounded retries, and a five-minute server cron.
- Key files:
  - `lib/miniapp-notifications.ts`
  - `lib/wechat-miniapp-subscription.ts`
  - `scripts/queue-miniapp-course-reminders.ts`
  - `scripts/send-miniapp-course-reminders.ts`
  - `ops/server/scripts/setup_miniapp_course_reminder_cron.sh`
  - `tests/wechat-miniapp-subscription.test.ts`
  - `docs/tasks/TASK-20260712-miniapp-automatic-course-reminders.md`
- Risk impact (if any): Medium and constrained. Only due 24-hour reminders with recorded unused consent can call WeChat. Sent/skipped records are not reset, stale reminders are skipped, and 6-hour automation remains disabled.
- Verification: local unit tests, TypeScript, shell syntax, diff check, and full build passed; production deployed at `7aca10c`; PM2 is online and `/admin/login` returns 200; manual queue scanned 11 sessions and queued 0, sender scanned/sent 0, and the five-minute cron is installed exactly once.
- Rollback point: `2026-07-12-r226`.

---

## 2026-07-12-r226

- Release ID: `2026-07-12-r226`
- Date/Time (Asia/Shanghai): `2026-07-12`
- Deployment status: `LIVE`
- Scope: configure the official course-reminder subscription template, preserve all five template variables across production deploys, and make deployment fetch the requested branch explicitly.
- Key files:
  - `ops/server/scripts/deploy_app.sh`
  - `ops/server/scripts/quick_deploy.sh`
  - `docs/tasks/TASK-20260712-miniapp-course-template-configuration.md`
  - `docs/小程序与家长端全程托管规划-20260709.md`
- Risk impact (if any): Low. The parent course-reminder consent entry becomes available when the runtime variable is present, but no outbound WeChat sender is enabled and the other four reminder groups remain hidden. The deploy fetch change only makes the requested branch ref explicit.
- Verification: shell and configuration checks passed; production deployed at `e9f5f94`; runtime reports 1/5 templates configured with course enabled and the other groups hidden; PM2 is online and `/admin/login` returns 200. Follow-up deploy-fetch hardening is committed locally but awaits GitHub connectivity before source synchronization.
- Rollback point: `2026-07-11-r225`.

---

## 2026-07-11-r225

- Release ID: `2026-07-11-r225`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `LIVE`
- Scope: begin the second staff-miniapp phase with one-session location changes, atomic 2-12 week scheduling, teacher-originated reschedule Tickets, and subscription-message configuration/consent readiness.
- Key files:
  - `lib/miniapp-session-location-change.ts`
  - `lib/miniapp-session-scheduling.ts`
  - `lib/miniapp-subscription-config.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/*`
  - `app/api/miniapp/subscriptions/intent/route.ts`
  - `app/api/admin/miniapp-notifications/route.ts`
  - `app/admin/miniapp-notifications/MiniappNotificationsClient.tsx`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `miniapp/boss-academic-parent/pages/home/*`
  - `docs/tasks/TASK-20260711-miniapp-phase-two-operations.md`
- Risk impact (if any): High but constrained. Location change creates a same-course/same-student branch Class and moves only the selected future Session, preserving the original Class and every other Session. Series scheduling is ADMIN-only, capped at 12 weeks, and all-or-nothing after per-week package and conflict checks. Teacher requests create or update internal `改课程时间` Tickets but never change a Session directly. Subscription controls remain hidden from parents until template IDs are configured; this release records consent but does not claim outbound WeChat delivery is enabled.
- Verification:
  - TypeScript, miniapp JavaScript/WXML, diff, and full Next.js build checks
  - real-data no-write location and two-week series previews with signed-token tamper rejection
  - route-level unauthenticated 401, valid preview 200, invalid apply 409, and unchanged Class/Session/Ticket snapshots
  - teacher-owned future Session request GET 200 and invalid-student POST 409/no-write
  - parent subscription configuration GET 200 with all five currently missing template IDs correctly reported
  - production deployment at commit `b09147b`, PM2 online, `/admin/login` 200
  - production valid location/series previews 200, invalid applies 409, teacher and parent permission checks passed, and no new workflow audit writes were created by testing
- Rollback point: previous production commit before `2026-07-11-r225`.

---

## 2026-07-11-r224

- Release ID: `2026-07-11-r224`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `LIVE`
- Scope: complete the first mobile academic-operations set: link scheduling Tickets to future lessons, handle leave/cancellation with an explicit charge decision, replace the teacher for one future lesson, and create the first one-on-one lesson directly from an open scheduling Ticket when no lesson anchor exists.
- Key files:
  - `lib/miniapp-session-cancellation.ts`
  - `lib/miniapp-session-teacher-replacement.ts`
  - `lib/miniapp-ticket-new-session.ts`
  - `lib/miniapp-session-scheduling.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/*`
  - `app/api/miniapp/staff/scheduling-coordination/[ticketId]/*`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/*`
  - `docs/tasks/TASK-20260711-miniapp-mobile-academic-actions.md`
- Risk impact (if any): High but constrained. New writes are ADMIN-only, future-session-only, signed-preview-confirmed, transactionally revalidated, and audited. Cancellation cannot proceed after attendance/deduction records exist; charge and no-charge are explicit. Teacher replacement affects one Session only. Ticket-originated first scheduling requires an active package, a qualified and available teacher, no student/teacher/room conflict, and an exact unique student-name match when a legacy Ticket lacks `studentId`.
- Verification:
  - TypeScript, miniapp JavaScript, WXML compatibility, diff, and full Next.js build checks
  - real-data read-only cancellation previews for charge and no-charge paths
  - real-data read-only teacher replacement preview and signed-token tamper rejection
  - real-data read-only first-scheduling preview for Ticket `20260709-009`, including unique legacy student matching
  - route-level apply rejection checks with unchanged Session, Attendance, Package, and Ticket data
  - production deployment at commit `888a0a9`, PM2 online, `/admin/login` 200
  - production authenticated previews return 200 for first scheduling, leave/cancellation, and one-session teacher replacement; unauthenticated access returns 401 and invalid apply tokens return 409
  - production verification documentation synchronized after the live checks
- Rollback point: previous production commit before `2026-07-11-r224`.

---

## 2026-07-11-r223

- Release ID: `2026-07-11-r223`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: add a dedicated `Need Info` board filter/count and allow permitted mobile staff to assign scheduling Tickets to Jasmine, Eva, Emily, or unassigned from the detail workflow.
- Key files:
  - `lib/miniapp-scheduling-coordination-board.ts`
  - `app/api/miniapp/staff/scheduling-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination/staff-coordination.js`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/*`
  - `docs/tasks/TASK-20260711-miniapp-scheduling-owner-assignment.md`
- Risk impact (if any): Low to medium. This changes only Ticket owner, coordination status/history, next action, and due date through the existing permission and transition checks. Older miniapp clients that omit owner preserve the existing owner. Session, package, attendance, finance, payroll, and completion behavior are unchanged.
- Verification:
  - production-data `Need Info` count is 3
  - owner option and invalid-owner rejection checks
  - invalid owner PATCH leaves the real Ticket unchanged
  - TypeScript, miniapp JavaScript, full build, and diff checks
- Rollback point: previous production commit before `2026-07-11-r223`.

---

## 2026-07-11-r222

- Release ID: `2026-07-11-r222`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: align the staff-miniapp scheduling board with the web Ticket Center by including all six active scheduling-related Ticket types instead of only the exact `排课协调` type.
- Key files:
  - `lib/miniapp-scheduling-coordination-board.ts`
  - `app/api/miniapp/staff/scheduling-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-home/staff-home.wxml`
  - `miniapp/boss-academic-parent/pages/staff-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/staff-coordination-detail.wxml`
  - `docs/tasks/TASK-20260711-miniapp-scheduling-board-scope.md`
- Risk impact (if any): Low to medium. This broadens read/update scope to existing open Tickets of `排课协调`, `改课程时间`, `新排课`, `补课加课`, `临时取消&请假课程`, and `改上课老师`. Permissions, state-transition validation, auditing, Session writes, and Ticket completion rules are unchanged.
- Verification:
  - production-data category reconciliation
  - authenticated board count changed from 1 exact coordination Ticket to 13 open scheduling-related Tickets
  - per-type count verification
  - TypeScript, miniapp syntax/JSON, and full build
- Rollback point: previous production commit before `2026-07-11-r222`.

---

## 2026-07-11-r221

- Release ID: `2026-07-11-r221`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: add a dedicated staff-miniapp scheduling-coordination board with open/overdue counts, filters, search, detail access, communication history updates, and follow-up management.
- Key files:
  - `lib/miniapp-scheduling-coordination-board.ts`
  - `app/api/miniapp/staff/scheduling-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/*`
  - `miniapp/boss-academic-parent/app.json`
  - `docs/tasks/TASK-20260711-miniapp-coordination-board.md`
- Risk impact (if any): Medium. ADMIN, CS, and active CS-workspace staff can update open scheduling-coordination Ticket status, communication history, next action, and due date from the miniapp. Teachers and other staff cannot access the board. Ticket completion remains tied to the guarded mobile scheduling workflow; this board cannot directly complete a Ticket or write Sessions.
- Verification:
  - ADMIN/CS/teacher/CS-workspace permission checks
  - authenticated real-data board and detail GET checks
  - invalid PATCH rejection with unchanged Ticket verification
  - unauthenticated 401 check
  - miniapp JavaScript/JSON checks
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-11-r221`.

---

## 2026-07-11-r220

- Release ID: `2026-07-11-r220`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: let an ADMIN explicitly complete matching open scheduling-coordination Tickets in the same transaction as a successful miniapp lesson create/reschedule operation.
- Key files:
  - `lib/miniapp-session-scheduling.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/manage/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260711-miniapp-scheduling-ticket-closure.md`
- Risk impact (if any): Medium. Ticket completion is optional and defaults to no selection. Only open scheduling-coordination Tickets for the same lesson students and matching course returned by the signed preview can be selected; eligibility is checked again inside the Session write transaction. No teacher, room, campus, package ledger, attendance deduction, billing, receipt, payroll, or OpenClaw behavior changes.
- Verification:
  - TypeScript and miniapp JavaScript syntax checks
  - preview-token eligible-ticket binding and unpreviewed-ticket rejection checks
  - read-only real-data scheduling preview
  - no-selection/no-write route smoke check
  - `npm run build`
- Rollback point: previous production commit before `2026-07-11-r220`.

---

## 2026-07-11-r219

- Release ID: `2026-07-11-r219`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: allow Eva and management ADMIN accounts to create a same-class lesson or reschedule one future lesson from the staff miniapp after a signed conflict-check preview.
- Key files:
  - `lib/miniapp-session-scheduling.ts`
  - `lib/miniapp-staff-session.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/manage/route.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260711-miniapp-scheduling-writes.md`
- Risk impact (if any): High. This adds production Session writes from the native miniapp, restricted to ADMIN staff and to one lesson per confirmed operation. It revalidates student, teacher, room, availability, package, duplicate, attendance-lock, and future-time rules immediately before writing. Billing, attendance deduction, package ledger mutation, payroll, and OpenClaw are unchanged.
- Verification:
  - ADMIN/CS/TEACHER permission checks
  - signed preview token and tamper checks
  - read-only real-data reschedule preview through the staff route
  - apply-without-preview rejection check
  - miniapp JavaScript and affected WXML checks
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-11-r219`.

---

## 2026-07-11-r218

- Release ID: `2026-07-11-r218`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: add a role-aware staff miniapp lesson detail and a mobile scheduling-coordination communication loop that creates or reuses the existing Ticket workflow.
- Key files:
  - `lib/miniapp-staff-session.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/route.ts`
  - `app/api/miniapp/staff/schedule/[sessionId]/coordination/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260711-miniapp-scheduling-coordination.md`
- Risk impact (if any): Medium. Admin/CS staff can now create or update scheduling-coordination Tickets and append internal communication records from a lesson detail. Teachers remain restricted to their assigned lesson and do not receive coordination-write access. This release does not change lesson times, scheduling execution, attendance deduction, package balances, finance, receipts, payroll, or OpenClaw.
- Verification:
  - role-capability unit smoke checks
  - read-only production-data lesson-detail check
  - authenticated admin staff detail/coordination GET route smoke check
  - miniapp JavaScript, JSON, and affected WXML checks
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-11-r218`.

---

## 2026-07-11-r217

- Release ID: `2026-07-11-r217`
- Date/Time (Asia/Shanghai): `2026-07-11`
- Deployment status: `READY`
- Scope: move parent-request visibility, internal intake notes, communication source, assisted-entry identity, and parent-facing completion result from temporary Ticket text conventions into formal Ticket fields.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260711103000_add_parent_request_visibility_fields/migration.sql`
  - `lib/miniapp-parent-requests.ts`
  - `app/api/miniapp/staff/parent-requests/*`
  - `app/api/miniapp/students/[studentId]/requests/route.ts`
  - `app/api/miniapp/requests/[ticketId]/route.ts`
  - `app/api/admin/ops/parent-requests/[id]/route.ts`
  - `docs/tasks/TASK-20260711-parent-request-formal-fields.md`
- Risk impact (if any): Medium. The migration marks existing `家长小程序` Tickets parent-visible and backfills structured values where their legacy tagged summary contains them. API reads retain a legacy fallback, while scheduling, attendance, package balance, finance, receipt, payroll, and normal Ticket flows are unchanged.
- Verification:
  - `npx prisma generate`
  - `npx tsc --noEmit`
  - miniapp JavaScript and JSON parse checks
  - `npm run build`
  - production migration, health, and version-alignment checks
- Rollback point: previous production commit before `2026-07-11-r217`.

---

## 2026-07-10-r216

- Release ID: `2026-07-10-r216`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: preserve WeChat miniapp credentials when the production deploy script rewrites `.env`.
- Key files:
  - `ops/server/scripts/deploy_app.sh`
  - `docs/tasks/TASK-20260710-deploy-preserve-miniapp-credentials.md`
- Risk impact (if any): Low. This changes deploy-time environment rendering only. It prevents future deploys from dropping `WECHAT_MINIAPP_APPID` and `WECHAT_MINIAPP_SECRET` after they are configured in `ops/server/.deploy.env`.
- Verification:
  - release doc gate
  - production `.env` contains the miniapp variable names after deploy without printing secret values
  - `/admin/login` health check
  - miniapp unauthenticated endpoints still return `Unauthorized`
- Rollback point: previous production commit before `2026-07-10-r216`.

---

## 2026-07-10-r215

- Release ID: `2026-07-10-r215`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: require a parent-visible completion result before staff/admin can mark parent requests as completed, and show that result in the parent miniapp request detail.
- Key files:
  - `lib/miniapp-parent-requests.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/route.ts`
  - `app/api/admin/ops/parent-requests/[id]/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `miniapp/boss-academic-parent/pages/request-detail/*`
  - `app/admin/mobile/parent-requests/ParentRequestsMobileClient.tsx`
  - `docs/tasks/TASK-20260710-parent-request-completion-result-required.md`
- Risk impact (if any): Medium. Completing a parent request now requires staff/admin to write a parent-facing result. This reduces vague closures, but staff need to understand the result is visible to parents.
- Verification:
  - `npx tsc --noEmit`
  - miniapp JS syntax and JSON parse checks
  - parent/staff request-detail WXML complex-expression scan
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r215`.

---

## 2026-07-10-r214

- Release ID: `2026-07-10-r214`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: sanitize staff-assisted parent request visibility so parent miniapp views only receive the parent-facing summary while staff/admin views can still see internal original notes and communication source.
- Key files:
  - `lib/miniapp-parent-requests.ts`
  - `app/api/miniapp/staff/parent-requests/*`
  - `app/api/admin/ops/parent-requests/*`
  - `app/api/miniapp/students/[studentId]/requests/route.ts`
  - `miniapp/boss-academic-parent/pages/request-detail/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-assisted-request-visibility.md`
- Risk impact (if any): Medium. This changes the DTO projection for parent-request tickets. It intentionally hides staff-assisted internal original notes and screenshots from parent miniapp responses while preserving them for staff/admin responses.
- Verification:
  - miniapp JS syntax and JSON parse checks
  - parent/staff request-detail WXML complex-expression scan
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r214`.

---

## 2026-07-10-r213

- Release ID: `2026-07-10-r213`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: fix student monthly schedule PDF exports so lessons with a per-session replacement teacher show the replacement teacher instead of the class default teacher.
- Key files:
  - `app/api/exports/student-schedule/[id]/route.ts`
  - `lib/student-schedule-export.ts`
  - `tests/student-schedule-export.test.ts`
  - `package.json`
  - `docs/tasks/TASK-20260710-student-schedule-export-teacher-override.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes only the read-side student schedule PDF teacher label. Scheduling writes, teacher replacement history, attendance deduction, package balances, payroll, billing, partner settlement, miniapp, and OpenClaw behavior are unchanged.
- Verification:
  - read-only DB check confirmed the 2026-07-12 王钰澄 lesson has class teacher Jasmine, session teacher Zoe, and effective teacher Zoe
  - `npm run test:backend`
  - `npx tsc --noEmit`
- Rollback point: previous production commit before `2026-07-10-r213`.

---

## 2026-07-10-r212

- Release ID: `2026-07-10-r212`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: add staff miniapp assisted parent-request creation so Emily-style operators can turn WeChat group messages into existing Ticket-based parent requests.
- Key files:
  - `app/api/miniapp/staff/parent-requests/route.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/attachments/route.ts`
  - `app/api/miniapp/staff/students/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-request-new/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `miniapp/boss-academic-parent/utils/api.js`
  - `docs/tasks/TASK-20260710-miniapp-staff-assisted-parent-request.md`
- Risk impact (if any): Medium. This adds a new staff-authenticated Ticket creation path for parent requests. It reuses existing parent request ownership/status rules and stores screenshots as ticket files; it does not change package deduction, scheduling writes, finance, payroll, or parent binding.
- Verification:
  - miniapp JS syntax and JSON parse checks
  - staff WXML complex-expression scan
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r212`.

---

## 2026-07-10-r211

- Release ID: `2026-07-10-r211`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: add teacher mobile attendance marking to the staff miniapp course detail page.
- Key files:
  - `app/api/miniapp/staff/schedule/[sessionId]/attendance/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-attendance.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds a new miniapp write path to `Attendance`, using the same teacher/session permission rule as the existing teacher portal and preserving deduction/package fields on updates. It does not deduct packages, reschedule lessons, change billing, payroll, partner settlement, or OpenClaw behavior.
- Verification:
  - miniapp JS syntax and JSON parse checks
  - staff WXML complex-expression scan
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r211`.

---

## 2026-07-10-r210

- Release ID: `2026-07-10-r210`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: fix native miniapp staff-page blank rendering by removing complex WXML expressions from staff pages, moving display fallbacks into page JavaScript data, and making the staff home page resilient to slow miniapp API requests.
- Key files:
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `miniapp/boss-academic-parent/utils/api.js`
  - `miniapp/boss-academic-parent/app.json`
  - `docs/tasks/TASK-20260710-miniapp-staff-wxml-render-fix.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes only native miniapp presentation binding and request timeout behavior for staff pages. Backend routes, authentication, schedule reading, request updates, feedback writes, scheduling, attendance deduction, package ledger, billing, payroll, and OpenClaw behavior are unchanged.
- Verification:
  - staff WXML complex-expression scan
  - miniapp JS syntax and JSON parse checks
  - staff home remains renderable when optional count APIs time out
- Rollback point: previous production commit before `2026-07-10-r210`.

---

## 2026-07-10-r209

- Release ID: `2026-07-10-r209`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: add staff miniapp course detail feedback submission so teachers can submit or update parent-facing after-class feedback from the native miniapp.
- Key files:
  - `app/api/miniapp/staff/schedule/[sessionId]/feedback/route.ts`
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-feedback.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds a new teacher-facing miniapp write path to `SessionFeedback`, reusing the same five-section parent-facing feedback rules and server-side teacher/session permission checks as the existing teacher portal. Scheduling, attendance deduction, package ledger, billing, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw behavior are unchanged.
- Verification:
  - miniapp JS syntax and JSON parse checks
  - `npx tsc --noEmit`
  - staff feedback route included in Next production build
  - post-deploy unauthorized route smoke check
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r209`.

---

## 2026-07-10-r208

- Release ID: `2026-07-10-r208`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: add the staff miniapp daily schedule view so ops/management can see all same-day lessons and teachers can see their own lessons, with request type filtering for scheduling coordination.
- Key files:
  - `lib/miniapp-staff-schedule.ts`
  - `app/api/miniapp/staff/schedule/route.ts`
  - `app/api/miniapp/staff/parent-requests/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-schedule.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds read-side staff miniapp schedule access and type filtering for miniapp request queues. Teacher accounts are forced to their linked teacher schedule. Scheduling writes, attendance deduction, package ledger, receipts, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw behavior are unchanged.
- Verification:
  - miniapp JS syntax and JSON parse checks
  - `npx tsc --noEmit`
  - staff schedule API smoke check for unauthorized access, admin/all schedule access, and teacher-only schedule scoping
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r208`.

---

## 2026-07-10-r207

- Release ID: `2026-07-10-r207`
- Date/Time (Asia/Shanghai): `2026-07-10`
- Deployment status: `READY`
- Scope: ship the native miniapp backend foundation for parent access, staff mobile request handling, notification queueing, and production-domain miniapp configuration.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260709110000_add_parent_portal/migration.sql`
  - `prisma/migrations/20260709123000_add_miniapp_notification_outbox/migration.sql`
  - `prisma/migrations/20260710103000_add_staff_miniapp/migration.sql`
  - `app/api/miniapp/**`
  - `app/api/admin/miniapp-staff/**`
  - `app/api/admin/miniapp-notifications/**`
  - `app/api/admin/ops/parent-requests/**`
  - `app/api/admin/students/[id]/parent-portal/**`
  - `app/admin/miniapp-staff/**`
  - `app/admin/miniapp-notifications/**`
  - `app/admin/mobile/**`
  - `miniapp/boss-academic-parent/**`
  - `docs/tasks/TASK-20260710-miniapp-parent-staff-foundation.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds new miniapp-facing auth/session/binding tables and routes, plus staff request handling. Existing admin login, scheduling, attendance deduction, package ledger, receipts, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw behavior are unchanged.
- Verification:
  - `npx prisma generate`
  - `npx prisma validate`
  - `npx prisma migrate status`
  - `npx tsc --noEmit`
  - miniapp JS syntax and JSON parse checks
  - mock staff miniapp binding/login/request-list/status-update smoke checks against local dev server
  - `npm run build`
- Rollback point: previous production commit before `2026-07-10-r207`.

---

## 2026-07-08-r206

- Release ID: `2026-07-08-r206`
- Date/Time (Asia/Shanghai): `2026-07-08`
- Deployment status: `READY`
- Scope: make the Partner Settlement rate section read-only and route rate edits to Partner Setup, so settlement operators cannot accidentally overwrite partner master rates from the settlement workbench.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/tasks/TASK-20260708-partner-settlement-rate-readonly.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This removes only the settlement-page rate update action and keeps settlement amount calculation unchanged. Future settlement records still use the selected partner's saved rates, while existing generated settlement records keep their stored amounts.
- Verification:
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-07-08-r206`.

---

## 2026-07-08-r205

- Release ID: `2026-07-08-r205`
- Date/Time (Asia/Shanghai): `2026-07-08`
- Deployment status: `READY`
- Scope: add multi-partner settlement configuration so New Oriental remains the legacy partner while Shanghai Xin Zhuo Si and future partners can be configured, billed, receipted, and settled independently.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260708120000_add_multi_partner_config/migration.sql`
  - `lib/partners.ts`
  - `lib/partner-billing.ts`
  - `app/admin/partners/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `docs/tasks/TASK-20260708-multi-partner-settlement-config.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds a Partner configuration table and threads `partnerId` through partner settlement, invoice, receipt, payment-proof, top-up snapshot, and billing workbench flows. Legacy New Oriental data is backfilled and old partner-billing JSON without `partnerId` is treated as New Oriental only. Parent billing, direct-billing contracts, attendance deduction, scheduling, teacher payroll, transport billing, Business Accounts, and OpenClaw behavior are unchanged.
- Verification:
  - `npx prisma generate`
  - `npx tsc --noEmit`
  - `npm run test:backend`
  - `npx prisma migrate deploy`
  - read-only Prisma check confirmed `新东方` and `上海新卓思` Partner configs exist and 32 legacy New Oriental settlement records are bound to `legacy-xdf-partner`.
  - local smoke checks compiled `/admin/reports/partner-settlement`, `/admin/reports/partner-settlement/billing`, and `/admin/partners`.
  - `npm run build`
- Rollback point: previous production commit before `2026-07-08-r205`.

---

## 2026-07-02-r204

- Release ID: `2026-07-02-r204`
- Date/Time (Asia/Shanghai): `2026-07-02`
- Deployment status: `READY`
- Scope: widen the Teacher Feedback Desk overdue-session scan so older valid missing-feedback sessions inside the 90-day lookback are included in `Missing > 12h`, while keeping excused/no-effective-student sessions excluded.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `docs/tasks/TASK-20260702-feedback-desk-overdue-scan-limit.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only increases the read-side scan limit for the admin feedback workbench and keeps the display cap in place. Feedback writes, proxy drafts, forwarded records, teacher submissions, attendance, package balances, payroll, billing, scheduling, and OpenClaw behavior are unchanged.
- Verification:
  - read-only Prisma check confirmed the restored overdue queue now includes 13 valid missing-feedback sessions instead of 10 under the same 90-day lookback.
  - `npm run build`
- Rollback point: previous production commit before `2026-07-02-r204`.

---

## 2026-07-02-r203

- Release ID: `2026-07-02-r203`
- Date/Time (Asia/Shanghai): `2026-07-02`
- Deployment status: `READY`
- Scope: remove the dangerous bulk overdue-feedback forwarding action from Teacher Feedback Desk and disable its API endpoint, so `Missing > 12h` and `Proxy draft pending teacher` queues cannot be accidentally cleared as manually forwarded feedback.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `app/api/admin/feedbacks/bulk-forward-overdue/route.ts`
  - `docs/tasks/TASK-20260702-feedback-desk-disable-bulk-overdue-forward.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This removes a broad admin cleanup shortcut from the live feedback desk and keeps the safer per-item workflow: create/update proxy drafts from overdue queues, then mark completed teacher feedback from Pending Forward. Existing feedback records, teacher submission, forwarded history, attendance, package balances, payroll, billing, scheduling, and OpenClaw behavior are unchanged.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-07-02-r203`.

---

## 2026-06-23-r202

- Release ID: `2026-06-23-r202`
- Date/Time (Asia/Shanghai): `2026-06-23`
- Deployment status: `READY`
- Scope: fix the Manager Quality Desk feedback form so selecting `Give feedback / 给反馈` from a Lead Desk session refreshes the teacher and related-session dropdowns to match the selected course.
- Key files:
  - `app/admin/manager/quality/page.tsx`
  - `docs/tasks/TASK-20260623-manager-feedback-selected-session-defaults.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes default UI selection for the manager feedback form. Feedback storage, teacher acknowledgement, scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw behavior are unchanged.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-06-23-r202`.

---

## 2026-06-23-r201

- Release ID: `2026-06-23-r201`
- Date/Time (Asia/Shanghai): `2026-06-23`
- Deployment status: `READY`
- Scope: fix renewal contract parent-intake links for existing students who do not have reusable parent profile data yet. These renewal contracts now keep the parent profile form open until parent details a…97520 tokens truncated…arded-to-parent action.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-pdf-and-forwarded-flow.md`
- Risk impact (if any): Low. This release improves final-report export and admin UI wording only; no assignment rules, teacher submission rules, schema, attendance logic, or finance logic changed.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows `Download PDF` and the forwarded action text now reads as a parent-facing handoff
  - production read-only QA confirmed `/api/admin/final-reports/[id]/pdf` returns `200` with `application/pdf`
- Rollback point: previous production commit before `2026-04-03-r21`.

## 2026-04-03-r22

- Release ID: `2026-04-03-r22`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add final-report parent-delivery records, admin share-link controls, and a public read-only final-report page, while upgrading the printable PDF into a more formal delivery version.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403223000_add_final_report_delivery_and_share/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `app/final-report/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-phase-3a-and-3b.md`
- Risk impact (if any): Medium. This release adds new `FinalReport` metadata columns plus a public token-gated share page, but it does not change midterm-report logic, teacher fill rules, assignment rules, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows delivery actions and parent share-link controls
  - production read-only QA confirmed `/api/admin/final-reports/[id]/pdf` returns `200` with `application/pdf`
  - production read-only QA confirmed a tokenized `/final-report/[id]?token=...` page renders as a parent-safe read-only report
- Rollback point: previous production commit before `2026-04-03-r22`.

## 2026-04-03-r23

- Release ID: `2026-04-03-r23`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add expiry windows to final-report parent share links so operations can issue links with controlled validity and the public page can reject expired tokens cleanly.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403225500_add_final_report_share_expiry/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/final-report/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-share-expiry.md`
- Risk impact (if any): Low. This release only refines share-link validity windows and the public read-only guard page; it does not change teacher report content, delivery records, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows share-duration choices and expiry labels
  - production read-only QA confirmed `/final-report/[id]?token=invalid` still rejects invalid or expired links with the unavailable message
- Rollback point: previous production commit before `2026-04-03-r23`.

## 2026-04-03-r24

- Release ID: `2026-04-03-r24`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add basic share-link access audit for final reports so operations can see whether a parent read-only link has been opened and when it was last viewed.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403232000_add_final_report_share_audit/migration.sql`
  - `app/final-report/[id]/page.tsx`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-share-audit.md`
- Risk impact (if any): Low. This release only records read-only share-page access metadata and surfaces that metadata on the admin workbench; it does not change report content, delivery rules, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/final` shows share audit text when a link exists
  - production read-only QA confirmed the public share page still renders and now increments share-view metadata
- Rollback point: previous production commit before `2026-04-03-r24`.

## 2026-04-06-r01

- Release ID: `2026-04-06-r01`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: add a batch CSV export for the teacher payroll workbench so finance can export all teacher salary slips for the current payroll month and current table filters in one file.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/export/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-teacher-payroll-csv-export.md`
- Risk impact (if any): Low. This release only adds a read-only CSV export and a workbench link; it does not change payroll calculation, payroll workflow states, teacher confirmations, approvals, or payout logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed `/admin/reports/teacher-payroll` shows `Export CSV`
  - production read-only QA confirmed `/admin/reports/teacher-payroll/export?...` returns `200` with `text/csv`
- Rollback point: previous production commit before `2026-04-06-r01`.

## 2026-04-06-r02

- Release ID: `2026-04-06-r02`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: let admins permanently delete shared documents and make shared-document categories show up as clearer folder groupings.
- Key files:
  - `app/admin/shared-docs/page.tsx`
  - `lib/shared-doc-files.ts`
  - `lib/shared-doc-storage.ts`
  - `lib/shared-docs.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-shared-doc-delete-and-folder-groups.md`
- Risk impact (if any): Medium-low. This release adds a real delete path for shared documents and changes new upload paths to include category folders; it does not change shared-doc permissions, teacher/admin workflows outside the shared-doc page, or any finance, attendance, payroll, or reporting logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production UI check confirmed `/admin/shared-docs` now shows grouped category sections with folder hints
  - production UI check confirmed each shared-document row now exposes `Delete / 删除`
- Rollback point: previous production commit before `2026-04-06-r02`.

## 2026-04-07-r01

- Release ID: `2026-04-07-r01`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: fix shared-package midterm/final report assignment so each student on a shared `HOURS` package gets an independent report candidate, assignment, and exempt path instead of being collapsed into the primary package owner.
- Key files:
  - `lib/midterm-report.ts`
  - `lib/final-report.ts`
  - `app/admin/reports/midterm/page.tsx`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-shared-package-report-candidate-fix.md`
- Risk impact (if any): Medium-low. This release changes report-candidate generation and assign/exempt targeting for shared `HOURS` packages, but it does not change report content fields, attendance deduction logic, package balance logic, payroll logic, finance workflows, or report PDF/share behavior.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA should confirm `/admin/reports/midterm` and `/admin/reports/final` now show separate candidate rows for shared-package students when they each have qualifying attendance under the same package
- Rollback point: previous production commit before `2026-04-07-r01`.

## 2026-04-07-r02

- Release ID: `2026-04-07-r02`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: re-layout the final-report PDF into a compact single-page landscape handoff so normal-length reports fit on one page instead of spilling into multi-page output.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-single-page-layout.md`
- Risk impact (if any): Low. This release only changes PDF presentation density and page layout; it does not change final-report content, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the updated single-page landscape layout
- Rollback point: previous production commit before `2026-04-07-r02`.

## 2026-04-07-r03

- Release ID: `2026-04-07-r03`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: simplify the final-report PDF into a more parent-facing handoff by removing internal delivery/admin sections and hiding empty blocks so the one-page layout emphasizes progress, outcome, and next steps.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-parent-facing-pass.md`
- Risk impact (if any): Low. This release only changes the parent-facing PDF presentation and hides internal/admin-only sections from the printable handoff; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the simplified parent-facing layout
- Rollback point: previous production commit before `2026-04-07-r03`.

## 2026-04-07-r04

- Release ID: `2026-04-07-r04`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: reshape the final-report PDF into a more renewal-oriented family handoff so the top summary frames the student's progress and recommended continuation path more clearly.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-renewal-guidance-pass.md`
- Risk impact (if any): Low. This release only changes parent-facing PDF wording and section emphasis; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the updated continuation-focused layout
- Rollback point: previous production commit before `2026-04-07-r04`.

## 2026-04-07-r05

- Release ID: `2026-04-07-r05`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: soften the final-report PDF again so it reads as a parent-friendly growth reflection, focusing on progress, current gaps, and next-stage learning focus instead of explicit renewal guidance.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-gentle-parent-feedback-pass.md`
- Risk impact (if any): Low. This release only changes parent-facing PDF wording and section labels; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the gentler parent-feedback framing
- Rollback point: previous production commit before `2026-04-07-r05`.

## 2026-04-07-r06

- Release ID: `2026-04-07-r06`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: further soften the parent-facing final-report PDF so the section titles and summary row read more like teacher observations to family instead of system labels.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-teacher-letter-tone-pass.md`
- Risk impact (if any): Low. This release only changes parent-facing PDF labels and summary wording; it does not change final-report data, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the softer teacher-to-family tone
- Rollback point: previous production commit before `2026-04-07-r06`.

## 2026-04-07-r07

- Release ID: `2026-04-07-r07`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: remove large empty blocks from the parent-facing final-report PDF by making the lower content cards reflow based on how many filled sections are actually present.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-auto-grid-pass.md`
- Risk impact (if any): Low. This release only changes printable card layout density; it does not change final-report data, wording intent, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with the adaptive lower-card layout
- Rollback point: previous production commit before `2026-04-07-r07`.

## 2026-04-07-r08

- Release ID: `2026-04-07-r08`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: remove the remaining duplicate feel in the parent-facing final-report PDF by hiding the extra `Next learning focus` body card whenever the teacher already wrote `Areas to keep strengthening`.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-body-dedup-pass.md`
- Risk impact (if any): Low. This release only changes printable section visibility; it does not change final-report data, summary wording, assignment rules, delivery/share logic, attendance logic, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - admin PDF download route should continue returning `200 application/pdf` with fewer repeated body sections
- Rollback point: previous production commit before `2026-04-07-r08`.

## 2026-04-08-r08

- Release ID: `2026-04-08-r08`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: add split purchase-batch entry for partner package create/top-up flows so 新东方 package sales can be recorded as separate `PURCHASE` tranches like `6h + 30h` instead of one merged balance.
- Key files:
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/_components/PurchaseBatchEditor.tsx`
  - `lib/package-purchase-batches.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-partner-package-split-batch-entry.md`
- Risk impact (if any): Medium-low. This release changes how new HOURS package purchases/top-ups can be recorded into multiple `PURCHASE` txns, but it does not change deduction math, package balance totals, student billing, parent billing, or offline monthly settlement logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - package create and top-up APIs now accept split purchase batches and preserve tranche order for later partner settlement FIFO
- Rollback point: previous production commit before `2026-04-08-r08`.

## 2026-04-08-r09

- Release ID: `2026-04-08-r09`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: switch 新东方 purchase-batch entry from raw minute/hour wording to lesson-based entry so ops can record split sales in `6 / 8 / 10 / 20 / 40 lessons` terms while the backend still stores 45-minute tranches.
- Key files:
  - `app/admin/_components/PurchaseBatchEditor.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-xdf-purchase-batch-lessons-ui.md`
- Risk impact (if any): Low. This release only changes the admin create/top-up entry UI for 新东方 split purchase batches; it does not change the stored FIFO settlement logic, package balances, deduction math, or invoice rules.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - 新东方 split-batch entry now shows lessons-based rows and quick-add chips while still saving 45-minute batch totals underneath
- Rollback point: previous production commit before `2026-04-08-r09`.

## 2026-04-09-r01

- Release ID: `2026-04-09-r01`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: add scheduling coordination tickets on student detail pages so ops can track parent scheduling follow-up, generate candidate slots from trusted teacher availability, and check whether a parent special-time request is inside or outside submitted availability before going back to the teacher.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/tickets/intake/IntakeForm.tsx`
  - `lib/tickets.ts`
  - `lib/scheduling-coordination.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260409100000_add_ticket_student_and_scheduling_coordination/migration.sql`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-phase-1-and-2.md`
- Risk impact (if any): Medium-low. This release adds a nullable `Ticket.studentId`, a new scheduling-coordination ticket type, student-detail coordination helpers, and todo reminders, but it does not change actual session creation, availability rules, booking links, attendance, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - student detail now shows a `Scheduling coordination / 排课协调` card with ticket summary, availability-based candidate slot generation, and special-time availability matching
- Rollback point: previous production commit before `2026-04-09-r01`.

## 2026-04-09-r02

- Release ID: `2026-04-09-r02`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: add a teacher-side `Scheduling Exceptions / 排课例外确认` page so teachers only respond to coordination tickets that already sit outside their submitted availability, instead of being pulled into everyday scheduling back-and-forth.
- Key files:
  - `app/teacher/scheduling-exceptions/page.tsx`
  - `app/teacher/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-teacher-exception-page.md`
- Risk impact (if any): Low. This release adds a teacher-facing view and lightweight ticket status updates for scheduling exceptions, but it does not change teacher availability rules, actual session creation, booking links, attendance, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - teacher portal now includes `Scheduling Exceptions / 排课例外确认`, and the page only lists scheduling coordination tickets in `Waiting Teacher` or `Exception`
- Rollback point: previous production commit before `2026-04-09-r02`.

## 2026-04-09-r03

- Release ID: `2026-04-09-r03`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: make student-detail scheduling coordination much more direct by turning generated slots and availability-backed alternatives into action cards that can jump straight into `Quick Schedule` with the same suggested time and preferred teacher already carried over.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-slot-cards-and-quick-schedule-bridge.md`
- Risk impact (if any): Low. This release only changes student-detail coordination helper presentation and how suggested slots prefill `Quick Schedule`; it does not change teacher availability rules, actual session creation APIs, booking links, attendance, package balances, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - generated coordination slots, matched special-time results, and alternative slots now render as action cards with direct `Use in Quick Schedule` entry points
- Rollback point: previous production commit before `2026-04-09-r03`.

## 2026-04-10-r18

- Release ID: `2026-04-10-r18`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance receipt workspace flow more continuous by clarifying post-approval next steps, expanding history filters, compressing repair-card actions, and showing fuller package-workspace progress.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes finance receipt workspace presentation, navigation feedback, and search/filter controls; it does not change invoice creation, receipt approval rules, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - approve/reject actions now either land on the next receipt with a clear `Now reviewing the next item / 现在已切到下一条` banner or return to the default queue with a `This queue section is clear for now / 当前这一组已经清完了` banner when that lane is exhausted
  - `Receipt History / 收据历史` now filters from one form across focus, party side, month, and action type
  - partner-side finance actions now appear in `Recent Finance Actions / 最近财务操作` when the history view is switched to `Partner only / 只看合作方`
  - `Proof Repair / 凭证修复` queue cards now keep one primary fix action visible and move secondary links into `More actions / 更多操作`
  - the package workspace now shows a fourth `Step 4 Approval Queue / 步骤4 进入审批` card plus summary chips for usable proofs, created receipts, waiting approval, and completed receipts
- Rollback point: previous production commit before `2026-04-10-r18`.

## 2026-04-10-r19

- Release ID: `2026-04-10-r19`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: let finance export the filtered receipt history as CSV and make the package finance workspace explicitly tell the user what step to do next.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/history/export/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release adds a read-only CSV export and another finance guidance panel; it does not change invoice creation, receipt approvals, package balances, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - `Receipt History / 收据历史` now exposes `Export CSV / 导出CSV`, and the export follows the active history filters for focus, side, month, action type, and keyword
  - partner-side history actions are included in the CSV when the history view is filtered to `Partner only / 只看合作方`
  - the package workspace now shows a `Suggested next step / 建议下一步` panel that points finance directly to upload, create receipt, approval queue, or back to the global queue depending on current package state
- Rollback point: previous production commit before `2026-04-10-r19`.

## 2026-04-10-r20

- Release ID: `2026-04-10-r20`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the package finance workspace easier to open when finance is dealing with a large number of student packages.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes how finance finds and opens package workspaces; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - the package workspace opener now includes a keyword search input for student, course, invoice no., receipt no., or package ID
  - the same opener now shows a priority package list with direct `Open package / 打开课包` actions, sorted so the most urgent finance packages float first
  - the quick-select dropdown now follows the same filtered search results instead of forcing finance to scan the entire package list
- Rollback point: previous production commit before `2026-04-10-r20`.

## 2026-04-10-r21

- Release ID: `2026-04-10-r21`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: help finance reopen the same few student packages quickly without searching from scratch each time.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/PackageWorkspaceRecentPackagesClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only remembers recent package openings in the browser and adds faster reopen links in the package workspace; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - opening a package from the package workspace search, dropdown, or priority list now records it into `Recently opened packages / 最近打开的课包`
  - the recent-package list appears inside the package workspace with direct reopen actions and a clear button
  - reloading the page keeps the recent-package list because the memory stays in browser local storage, not in billing data
- Rollback point: previous production commit before `2026-04-10-r21`.

## 2026-04-10-r22

- Release ID: `2026-04-10-r22`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: stop the package workspace search from reloading the whole page and give finance a clear confirm flow for opening packages.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/PackageWorkspacePickerClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release moves package searching into a client-side picker and keeps recent-package shortcuts in browser storage; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - package search now filters locally with `Search / 搜索` and `Clear / 清除` buttons instead of reloading the page
  - pressing Enter inside the package search input now applies the local filter instead of submitting a full page request
  - only `Open Finance Operations / 打开财务操作`, `Open package / 打开课包`, or `Open again / 重新打开` navigates into a package
- Rollback point: previous production commit before `2026-04-10-r22`.

## 2026-04-10-r23

- Release ID: `2026-04-10-r23`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance package picker denser so the search area and recent shortcuts take less vertical space.
- Key files:
  - `app/admin/receipts-approvals/_components/PackageWorkspacePickerClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only tightens the layout of the client-side package picker; it does not change invoice creation, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - the recent-package list now shows fewer, tighter rows with shorter metadata
  - priority and search-result package cards now use a denser row layout and occupy less page height
  - clearing search also resets the quick-select field back to the current package
- Rollback point: previous production commit before `2026-04-10-r23`.

## 2026-04-10-r24

- Release ID: `2026-04-10-r24`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance student-package invoice page easier to use when the package list is crowded.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/finance/student-package-invoices/_components/PackageSelectAutoSubmit.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only improves package finding on the finance invoice page; it does not change invoice issuance, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - the finance invoice package picker now supports local search by student, course, or package ID
  - the picker no longer auto-submits on every change, so finance can search first and then click `Load package summary / 加载课包摘要`
  - the page still loads package totals and invoice preview only after the chosen package is submitted
- Rollback point: previous production commit before `2026-04-10-r24`.

## 2026-04-10-r01

- Release ID: `2026-04-10-r01`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: add a separate parent package Statement of Account PDF and clarify that formal receipt PDFs only unlock after full manager and finance approval.
- Key files:
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release adds a read-only finance PDF and clearer export copy, but it does not change invoice creation, receipt approvals, package balances, settlement, or deduction logic.
- Verification:
  - `npm run build` passed
  - finance invoice workbench now exposes `Statement of Account PDF` for a selected package
  - package billing now exposes the same statement export and clearer receipt export wording
  - receipt PDF export still requires full manager and finance approval
  - statement PDF now has a more formal finance-style title block, summary strip, and transaction-table hierarchy
  - finance invoice preview and latest-invoice table now show the invoice creator on-page without changing PDF output or billing logic
  - latest invoices now prefer `Name (email)` for creator display when the matching user exists, so finance does not need to decode raw email addresses
  - package billing now uses the same `Name (email)` creator display in the invoice `By` column, so finance sees consistent creator labels across both invoice pages
  - receipt approvals no longer mislabel linked proofs as `file missing` when finance is reviewing the global queue without a specific `packageId`; file health now checks the queue row's actual linked payment record
  - receipt work is now split into clearer finance entry pages: the default page is a focused `Receipt Queue`, while `Package Workspace`, `Proof Repair`, and `Receipt History` each get their own dedicated route and sidebar entry without changing upload, receipt creation, or approval logic
  - `Proof Repair` now defaults to a more practical blocker view that shows rejected receipts and other repair-needed rows, instead of looking empty when there are no literal file-missing items
  - the `All / 全部` chip inside `Proof Repair` now truly expands back to the full repair-page queue instead of silently reapplying the default blocker filter
  - `Receipt History` now hides the conflicting bucket-switch row and only keeps history-appropriate controls, so the top page mode no longer fights with the lower queue toggles
  - `Receipt History` now sends `Back to default queue / 回到默认队列` to the actual receipt queue route instead of reloading the history page with `clearQueue=1`, so finance can truly jump back into active approval work
  - finance sidebar and receipt-page `Receipt Queue / 收据审批队列` links now open the real default approval queue with `clearQueue=1`, so clicking the queue entry no longer re-enters remembered `Receipt History`
  - the top receipt-mode tab `Receipt Queue / 收据审批队列` now uses the same default-queue reset target instead of carrying `queueBucket=HISTORY`, so switching out of `Receipt History` finally returns to the live approval queue
- Rollback point: previous production commit before `2026-04-10-r01`.

## 2026-04-11-r34

- Release ID: `2026-04-11-r34`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: make scheduling-coordination copy bilingual and make duplicate open coordination tickets visible on the student and ticket views.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `app/availability/[token]/page.tsx`
  - `lib/scheduling-coordination.ts`
  - `lib/parent-availability.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-multi-ticket-and-bilingual-copy.md`
- Risk impact (if any): Low. This release only changes scheduling-coordination wording and visibility around duplicate open tickets; it does not change package, finance, receipt, invoice, attendance, or actual lesson-placement logic.
- Verification:
  - `npm run build` passed
  - student detail now warns when more than one open scheduling-coordination ticket exists and shows which ticket is currently driving the coordination card
  - the student coordination card now explains that it picks the ticket with the earliest follow-up due date, then the newest created time
  - scheduling-coordination system copy now renders in bilingual form on the student detail page, ticket detail page, admin ticket list, archived tickets list, and teacher ticket list
  - parent-availability summaries now store bilingual field labels for future submissions
- Rollback point: previous production commit before `2026-04-11-r34`.

## 2026-04-11-r35

- Release ID: `2026-04-11-r35`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: reuse existing scheduling-coordination tickets instead of creating duplicates for the same student.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/tickets/intake/IntakeForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-ticket-reuse.md`
- Risk impact (if any): Low. This release only changes how scheduling-coordination ticket creation is routed when an open ticket already exists for the same student; it does not change scheduling placement, finance, package, receipt, invoice, or attendance logic.
- Verification:
  - `npm run build` passed
  - student detail now shows `Open active ticket / 打开当前工单` and a reuse note instead of encouraging a second open coordination ticket
  - student detail server action now redirects back with a bilingual reuse message when an open coordination ticket already exists
  - intake API now returns the existing open coordination ticket for the same student instead of creating another scheduling-coordination ticket
  - intake form now shows a bilingual reuse success message and preserves the existing parent-availability link when applicable
- Rollback point: previous production commit before `2026-04-11-r35`.
## 2026-04-24-r94

- Scope: auto-add direct-billing renewal hours to the package when the renewal contract is signed, and downgrade old direct top-up into a clearly marked special/manual path.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-direct-billing-renewal-auto-topup.md`
- Risk impact (if any): Medium. This release changes the direct-billing renewal completion flow by adding package minutes after signature. It avoids double top-up by writing and checking a renewal-contract package transaction marker before applying minutes.
- Verification:
  - `npm run build` passed
  - temporary direct-billing renewal QA confirmed package minutes moved from `600 -> 900`
  - the same QA confirmed one invoice draft was created and one `PURCHASE` package txn carried the renewal marker note
  - temporary QA student/package/contract/invoice data was deleted after verification

## 2026-04-24-r95

- Scope: polish the student-contract UX so ops see clearer business-stage states, the student page exposes the contract workspace directly, parent pages are lighter, and archived contract history no longer crowds the active workspace.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/contract-intake/[token]/page.tsx`
  - `app/contract/[token]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-ux-polish.md`
- Risk impact (if any): Low to medium. This release changes contract display and action framing, but does not change signing rules, invoice math, package balances, partner exclusion rules, or receipt logic.
- Verification:
  - `npm run build` passed
  - local QA student detail showed `Open contract workspace / 打开合同工作区` and the new business next-step copy for intake-stage contracts
  - local QA intake page showed `Parent profile confirmation / 家长资料确认`
  - local QA sign page showed `Agreement preview / 正式合同预览`
  - local QA sign-stage billing page showed `Waiting for signature`
  - temporary QA student/package/contract/auth-session data was deleted after verification

## 2026-04-24-r96

- Scope: resync package invoice-gate state when ops edit package settlement mode, so direct-billing packages do not keep stale partner-settlement gate copy.
- Key files:
  - `app/api/admin/packages/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-package-settlement-mode-gate-resync.md`
- Risk impact (if any): Low. This release only recalculates package invoice-gate display state during package edits; it does not change receipt rules, invoice math, partner settlement math, or scheduling logic.
- Verification:
  - `npm run build` passed
  - verified `赵测试` package now shows `settlementMode = null`
  - verified the same package now stores `financeGateReason = Package is exempt from direct-billing invoice gate.`

## 2026-04-24-r97

- Scope: fix signed student-contract signature visibility so future contracts require a handwritten signature image and legacy signed contracts no longer show a blank signature area.
- Key files:
  - `lib/student-contract.ts`
  - `lib/student-contract-pdf.ts`
  - `app/contract/[token]/page.tsx`
  - `app/api/exports/student-contract/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-signature-visibility-fix.md`
- Risk impact (if any): Low to medium. This release tightens future signature submission requirements and changes how legacy signed PDFs are served when no stored signature image exists, but does not change invoice creation math, package balances, or contract snapshot content.
- Verification:
  - `npm run build` passed
  - QA script confirmed sign attempts without handwritten signature now fail with `Handwritten signature is required`
  - generated and rendered a compatibility PDF for an existing signed contract with `signatureImagePath = null`
  - verified the legacy signature block is no longer blank

## 2026-04-24-r98

- Scope: clarify the signed-contract correction path in package billing so ops understand that signed or invoiced contracts no longer expose `Void`, and that the old invoice draft should be stopped before creating a replacement version.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-billing-copy-and-action-simplify.md`
- Risk impact (if any): Low. This release only changes billing-page guidance and action wording for signed/invoiced contracts; it does not change contract state rules, invoice math, package balances, or partner logic.
- Verification:
  - `npm run build` passed
  - verified signed/invoiced contract block now explains the old invoice must be stopped before replacement
  - verified terminal contract warning now explicitly says `Void` is no longer available after signing

## 2026-04-24-r99

- Scope: let ops delete an old unsigned receipt-free invoice draft from a signed contract, detach that old invoice from the contract history, and immediately create a replacement contract version that reuses the previous parent profile.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-invoice-delete-replacement-flow.md`
- Risk impact (if any): Medium. This release changes the correction flow after a signed contract has auto-created an invoice draft, but does not change receipt rules, partner settlement logic, or signed PDF generation.
- Verification:
  - `npm run build` passed
  - temporary QA confirmed deleting the linked invoice draft cleared the contract invoice linkage and moved the contract back to signed history
  - temporary QA confirmed replacement contract creation now produced a new `CONTRACT_DRAFT` and reused the previous parent profile

## 2026-04-24-r100

- Scope: simplify the student-contract billing workspace by removing duplicated signed-result copy and collapsing “save draft” plus “generate/refresh sign link” into one main action.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This release only changes billing-page copy and action flow around contract draft preparation; it does not change contract status rules, signed PDF behavior, invoice creation, or partner exclusions.
- Verification:
  - `npm run build` passed
  - verified contract-draft block now uses one button to save business fields and generate the latest sign link
  - verified the signed-result block no longer repeats bilingual invoice and approval labels
  - release-doc bundle finalized with matching task note

## 2026-04-24-r101

- Scope: make the public contract sign page immediately show a successful submission state after the parent signs, instead of quietly refreshing back into the same page.
- Key files:
  - `app/contract/[token]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-contract-sign-success-feedback.md`
- Risk impact (if any): Low. This release only changes the sign-page refresh and success feedback flow; it does not change contract snapshot content, invoice creation rules, or package balances.
- Verification:
  - `npm run build` passed
  - verified sign submit now revalidates the public contract route before redirecting back
  - verified the sign page now shows a green `Signature submitted successfully` message after submit

## 2026-04-24-r104

- Scope: make parent address optional across the new-student intake flow and the contract parent-profile intake flow, while keeping parent-profile reuse and contract generation working when no address is provided.
- Key files:
  - `app/contract-intake/[token]/page.tsx`
  - `app/student-intake/[token]/page.tsx`
  - `lib/student-parent-intake.ts`
  - `lib/student-contract.ts`
  - `lib/student-contract-template.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-parent-address-optional-intake.md`
- Risk impact (if any): Low. This release only relaxes address validation and hides the address line in generated contracts when no address is provided; it does not change contract signing rules, invoice creation, package balances, or partner exclusions.
- Verification:
  - `npm run build` passed
  - verified both `/student-intake/[token]` and `/contract-intake/[token]` no longer require address
  - verified backend intake submission succeeds without address
  - verified generated contract snapshots omit the address row when no address is present

## 2026-04-24-r105

- Scope: stop collapsing partner invoice PDFs after the first 10 selected settlement lines and instead render every chosen line item across paginated pages.
- Key files:
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-partner-invoice-full-line-pagination.md`
- Risk impact (if any): Low to medium. This release only changes partner invoice PDF layout and pagination; it does not change invoice totals, settlement selection, approval rules, or receipt behavior.
- Verification:
  - `npm run build` passed
  - verified partner invoice export no longer truncates to 10 rows
  - verified continuation pages repeat invoice/table headers and show full multiline descriptions
  - verified the old `... and N more items` summary is no longer rendered

## 2026-04-24-r106

- Scope: fix the partner invoice PDF follow-up layout so subtotal and remittance notes flow immediately after the last rendered rows instead of being pinned to the bottom of a mostly empty last page.
- Key files:
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-partner-invoice-final-page-layout-followup.md`
- Risk impact (if any): Low. This release only adjusts the final-page layout after partner invoice pagination; it does not change line selection, invoice totals, approvals, or receipt logic.
- Verification:
  - `npm run build` passed
  - verified totals block now starts below the last rendered row instead of being bottom-anchored
  - verified remittance notes are no longer clipped off the page on the last summary page

## 2026-04-24-r107

- Scope: move the optional partner invoice seal so it sits beside the subtotal summary block instead of staying pinned near the lower page edge.
- Key files:
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-partner-invoice-seal-near-subtotal.md`
- Risk impact (if any): Low. This release only repositions the optional seal image on partner invoice PDFs; it does not change invoice data, pagination, totals, approvals, or receipt behavior.
- Verification:
  - `npm run build` passed
  - verified the seal now renders next to the subtotal block on the final page
  - verified the subtotal values remain readable with the seal present

## 2026-04-24-r108

- Scope: tighten the partner invoice seal placement again so the seal visibly overlaps the subtotal summary area instead of merely sitting somewhere lower on the same page.
- Key files:
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-partner-invoice-seal-subtotal-overlap-followup.md`
- Risk impact (if any): Low. This release only adjusts the optional seal placement on partner invoice PDFs; it does not change invoice rows, totals, approvals, or receipt behavior.
- Verification:
  - `npm run build` passed
  - verified the seal now sits directly against the subtotal block
  - verified subtotal / GST / amount due stay readable after the stronger seal placement

## 2026-04-24-r109

- Scope: compact the partner invoice final page so line items fill more of the page before totals, and keep the optional seal/remittance block grouped correctly around the subtotal area.
- Key files:
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-partner-invoice-final-page-compaction-and-seal-anchor.md`
- Risk impact (if any): Low. This release only adjusts partner invoice PDF pagination and final-page positioning for totals, remittance notes, and the optional seal; it does not change invoice data, totals, approvals, or receipts.
- Verification:
  - `npm run build` passed
  - verified line items continue lower on the page before the final totals block
  - verified the optional seal stays attached to the subtotal area
  - verified remittance notes start below the grouped totals/seal block

## 2026-04-24-r110

- Scope: move first-purchase setup out of the student detail page and into a dedicated admin page, leaving the student page with a prominent CTA instead of the full embedded form.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/first-purchase/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-first-purchase-dedicated-page.md`
- Risk impact (if any): Low. This release only changes the admin UX for first-purchase setup; it does not change contract signing rules, invoice generation logic, or package balances.
- Verification:
  - `npm run build` passed
  - verified the student detail page now shows a prominent first-purchase CTA instead of the full embedded setup form
  - verified the new `/admin/students/[id]/first-purchase` page renders the setup fields once without repeated wording
  - verified successful submit redirects to the package contract workspace
- 2026-04-24: Added `/admin/finance/documents` and `/admin/finance/deleted-invoices` so finance can open full parent/partner invoice and receipt PDFs and trace deleted draft invoice history from one place, with direct links from finance workbench, package billing, package contract, and partner settlement billing.

## 2026-04-24-r112

- Scope: expose the new finance document center and deleted draft history pages in the finance-role allowlist and admin sidebar so logged-in finance users can actually open them without being bounced away.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-finance-document-center-nav-and-allowlist.md`
- Risk impact (if any): Low. This release only updates admin navigation and finance route access rules for already-shipped pages; it does not change invoice data, receipt approvals, or export rendering.
- Verification:
  - `npm run build` passed
  - verified `/admin/finance/documents` and `/admin/finance/deleted-invoices` appear in finance navigation
  - verified finance-role allowlist now includes both paths

## 2026-04-24-r113

- Scope: move the `Start first purchase setup / 开始首购建档` card to the very top of student detail content so ops can see the CTA immediately without scrolling past planning and enrollment sections.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-detail-first-purchase-cta-top.md`
- Risk impact (if any): Low. This release only repositions an existing student-detail CTA card; it does not change intake, contract, package, or billing logic.
- Verification:
  - `npm run build` passed
  - verified the first-purchase card renders before summary cards and the sticky student workbench
  - verified the old mid-page duplicate card is removed
  - verified the dedicated first-purchase page no longer repeats bilingual field labels such as `Course / 课程 / 课程 / Course`

## 2026-04-24-r114

- Scope: fix the first-purchase setup server action so a successful create-and-redirect no longer gets swallowed into a visible `NEXT_REDIRECT` error banner.
- Key files:
  - `app/admin/students/[id]/first-purchase/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-first-purchase-redirect-error-fix.md`
- Risk impact (if any): Low. This release only fixes redirect handling after a successful first-purchase create; it does not change intake eligibility rules, package creation payloads, or contract generation logic.
- Verification:
  - `npm run build` passed
  - verified successful first-purchase submit can rethrow the native Next.js redirect instead of rendering `NEXT_REDIRECT`
  - verified real failures still redirect back to the first-purchase page with a normal error message

## 2026-04-24-r115

- Scope: give student contract PDF downloads a business-friendly filename for both admin and parent downloads instead of a technical package-type filename.
- Key files:
  - `app/api/exports/student-contract/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-student-contract-download-filename.md`
- Risk impact (if any): Low. This release only changes the PDF download filename and content-disposition headers; it does not change contract content, signing logic, invoice generation, or permissions.
- Verification:
  - `npm run build` passed
  - verified contract downloads now use `学生名_课程名_首购/续费合同_已签/草稿_日期.pdf`
  - verified the same filename logic is used for admin and parent token-based downloads

## 2026-04-24-r116

- Scope: fix stored signed student-contract downloads so already-saved PDFs also use the new business-friendly filename instead of falling back to an old technical name.
- Key files:
  - `app/api/exports/student-contract/[id]/route.ts`
  - `lib/business-file-storage.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-stored-student-contract-download-filename-fix.md`
- Risk impact (if any): Low. This release only fixes the content-disposition filename for stored signed contract PDFs and aligns inline/download headers; it does not change contract content, signing, invoice generation, or access control.
- Verification:
  - `npm run build` passed
  - verified the stored signed-contract response now passes the business filename instead of the ASCII fallback
  - verified inline and attachment responses share the same UTF-8 filename logic

## 2026-04-24-r117

- Scope: show `Create renewal contract / 创建续费合同` inside the package contract workspace after a first-purchase contract is already signed, so ops can start the next renewal without leaving the current package page.
- Key files:
  - `app/admin/packages/[id]/contract/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-package-contract-renewal-cta-after-first-purchase.md`
- Risk impact (if any): Low. This release only adds a missing renewal CTA in the terminal first-purchase contract view; it does not change replacement flows, signing, invoice creation, or partner-package behavior.
- Verification:
  - `npm run build` passed
  - verified a signed first-purchase contract view can now show `Create renewal contract / 创建续费合同`
  - verified the replacement-contract action still remains available for correction cases


## 2026-04-24-r118

- Scope: fix renewal contract availability so a signed first-purchase contract on the current package can provide the reusable parent info needed for renewal.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260424-renewal-parent-info-current-package-fix.md`
- Risk impact (if any): Low. This release only changes how renewal parent-profile reuse is detected; it does not change signing, invoice creation, or partner-package logic.
- Verification:
  - `npm run build` passed
  - verified a signed first-purchase contract on the same package now qualifies for `Create renewal contract / 创建续费合同`
  - verified renewal draft creation now reuses parent info from the current package when needed
