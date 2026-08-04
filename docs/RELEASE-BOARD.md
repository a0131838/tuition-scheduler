# RELEASE BOARD

## Current Production Snapshot

- Current service: `sgtmanage.com`
- Process: `pm2 -> tuition-scheduler`
- Last checked: `2026-08-04`
- Health check: `/admin/login` => `200`
- Version alignment: `ALIGNED`
- Exact server/local/origin commit hashes: use `bash ops/server/scripts/new_chat_startup_check.sh`

## Current Known State

- Local HEAD: current production branch head for `feat/strict-superadmin-availability-bypass`.
- Previous server fix remains in place: upload static paths under `/uploads/*` are reachable.
- `bash ops/server/scripts/new_chat_startup_check.sh` confirmed local/origin/server are aligned and `/admin/login` => `200`.
- Current release line: `2026-07-27-r285` is live at commit `463b680d1c0c397b96edf48a849b0c92087c48e1`; WeChat development version `1.0.17` was uploaded successfully.
- Current release line: `2026-07-27-r286` is live at runtime feature commit `085ddd03ed79ac830ad9586ae2152161926ae747`; WeChat development version `1.0.18` was uploaded successfully. Existing business roles and workflows remain isolated.
- Current release line: `2026-07-27-r287` is live at runtime commit `0c2c431f8cb65f3d5741f18eae14f83a0800b3da`; WeChat development version `1.0.19` was uploaded successfully. It removes employee names and internal process explanations without changing data or workflows.
- Current release line: `2026-07-28-r288` is live at runtime commit `526ab99d6e821adf08d155fff8e027f0f9833ca8`; WeChat development version `1.0.20` was uploaded successfully. Find Schools now covers 13 official-source education sectors while preserving the existing international-school detail directory and all business workflows.
- Current release line: `2026-07-28-r289` is live at runtime commit `49f9ff847aa1c7180f3f85818ae7d389a39d722a`. It adds the authenticated role-aware Training Center, controlled SOP library, quizzes, practical evidence and manager sign-off without changing operational business workflows.
- Current release line: `2026-07-29-r295` is live at runtime feature commit `56da50e05568d5a47331a95c7c2b3e91996d3314`. It provides 28 bilingual competency modules, 296 controlled PDF pages, and eight role-based mini-program learning paths.
- Current release line: `2026-07-29-r296` is live at runtime feature commit `2c6badf0b4fba74e2b52d0976c28863b40f83310`. It corrects the parent binding route and provides 29 bilingual competency modules, 305 controlled PDF pages, and nine truthful mini-program learning paths.
- Current release line: `2026-07-29-r297` is live at runtime feature commit `e55fed18c7e481c320d94945f3e9ae0e3618b06f`. It gives ADMIN all-module training oversight and provides 33 bilingual competency modules, 345 controlled PDF pages, and 11 TEACHER-relevant modules.
- Current release line: `2026-07-29-r298` is live at runtime feature commit `857bb8584870fd4afd4f82a944fdd4a430adee2c`. It completes the Academic/CS curriculum with 20 relevant modules, 12 work chains, 35 controlled bilingual modules, and 365 PDF pages while preserving operational permissions.
- Current release line: `2026-07-29-r299` is live at runtime feature commit `152024fb2b7626b09274e68b5d0d40e291a7dee6`. Partner receipts use the invoice net after issued Credit Notes, while existing financial records and approval flows remain unchanged.
- Current release line prepared: `2026-07-29-r300` safely gates unlinked teacher accounts, exposes manager remediation, and improves training delivery and mobile/login polish without changing operational business data.
- Current release line prepared: `2026-07-31-r301` adds Business Accounts invoices and receipts to the central Finance Documents list and export without moving or rewriting source finance records.
- Current release line prepared: `2026-08-03-r302` adds current-day reminder recovery, explicit-family reminder consolidation, and audited course-change resends without changing schedules or sending messages automatically.
- Current release line prepared: `2026-08-03-r303` separates Web and Mini Program training and rebuilds all 35 current modules as complete Chinese-first, English-second, single-function beginner guides.
- Current release line prepared: `2026-08-03-r304` expands the core Academic Web scheduling module from five generic steps to a 40-page, 15-step beginner workflow with real Web screenshots and a module-only retraining version.
- Current release line prepared: `2026-08-03-r305` adds the missing click-by-click entry chain and expands Academic Web scheduling to 54 pages and 22 steps from login through final handover.
- Current release line prepared: `2026-08-04-r306` adds proactive next-month family scheduling confirmation, student/course-specific shared-package handling, real date-availability staffing forecasts, and Web/Mini Program follow-up queues without changing formal lessons automatically.
- Current release line prepared: `2026-08-04-r307` replaces repeated free-form time negotiation with ranked concrete teacher/time choices, 24-hour holds, a simplified Academic queue, and safe prefilling into the existing formally validated scheduling page.
- Normal production releases must run `bash ops/server/scripts/release_to_server.sh`; success requires one identical local/GitHub/server commit, a live PM2 PID and `/admin/login` HTTP 200.
- Care product order is now build-complete-first for the pre-university V1, followed by operator SOP and student-by-student configuration. University remains a lightweight consent-aware reporting service; complex postgraduate and career pipelines stay deferred.
- `2026-03-26-r1`, `2026-03-26-r2`, and `2026-03-26-r3` are now live on the current server commit lineage.
- Release-doc gate requires `CHANGELOG-LIVE`, `RELEASE-BOARD`, and a matching `TASK-*` file in the same deploy commit.

## 2026-08-04-r307 Ready

- Scope: convert a family's broad next-month change request into concrete, qualified options that can be ranked without using WeChat chat for every round of coordination.
- Parent Mini Program:
  - family members and courses remain separate visible items;
  - a change request can receive up to five concrete teacher, weekday, time, duration, and target-month session-count options;
  - the parent ranks up to three options, and the first still-available option is held for 24 hours;
  - after matching or scheduling, the parent can submit a change request without cancelling the current formal arrangement.
- Academic Mini Program:
  - the queue is reduced to `待确认`, `等家长`, `异常`, `已处理`, and `全部`;
  - a held parent choice appears in `待确认` with a readable expiry time;
  - confirming the choice accepts the hold, then opens the existing scheduling page with student, course, teacher, date, time, duration, and safe consecutive-week prefills;
  - `SCHEDULED` remains blocked until a real target-month lesson exists.
- Safety boundaries:
  - the migration only adds `MonthlySchedulingOffer` and its indexes/foreign keys;
  - offer generation reads real teacher date availability and existing lessons/appointments;
  - serializable transactions and stale-state guards protect competing holds and staff confirmation;
  - a parent offer never writes a formal Session and never changes an existing schedule;
  - no automatic WeChat message, package mutation, attendance deduction, invoice, receipt, payroll, contract, or ticket write is introduced.
- Verification before deploy:
  - Prisma schema validation and TypeScript passed;
  - 19 focused monthly-scheduling tests and all 328 repository tests passed;
  - Mini Program JavaScript syntax checks and the 56-page release audit passed with zero errors;
  - `git diff --check` and the complete 235-page production build passed.
- Post-deploy verification:
  - confirm local/GitHub/server commit equality, PM2 online, and `/admin/login` HTTP 200;
  - confirm the additive offer migration applied;
  - upload the matching Mini Program development version after the server is healthy;
  - designate the uploaded build as an experience version for role-based testing before submitting it for WeChat review and formal publication.
- Task doc: `docs/tasks/TASK-20260804-monthly-scheduling-concrete-options.md`.

## 2026-08-04-r306 Ready

- Scope: collect next-month intentions and availability before month end, then let Academic match demand to real teacher date availability before using the existing formal scheduling tools.
- Business impact:
  - each student and course has an independent response even when siblings share a package;
  - explicitly linked families receive one prepared message listing every child and course;
  - parents can keep, change, pause, or request contact, but their response never writes a formal Session;
  - Academic can follow up on Web or Staff Mini Program, save private notes, review 3–5 standard matches, and escalate no-match cases to a duplicate-safe teacher-exception ticket;
  - teachers can maintain 62 days of date-specific availability and see the active campaign deadline;
  - Finance can view the staffing forecast but cannot update the workflow;
  - the monthly schedule report distinguishes confirmed unscheduled demand from completed scheduling items.
- Safety boundaries:
  - additive migration only; existing business tables and records are not rewritten;
  - capacity uses `TeacherAvailabilityDate` only, subtracts overlapping commitments, and allocates each teacher minute only once across courses;
  - no automatic WeChat send and no automatic schedule creation, rescheduling, cancellation, teacher replacement, deduction, billing, or payroll action;
  - a completed scheduling item is locked against parent overwrite.
- Verification before deploy:
  - 22 focused tests, 135 backend tests, and all 325 repository tests passed;
  - TypeScript, Prisma schema validation, and `git diff --check` passed;
  - Mini Program release audit passed at 56 pages with zero errors;
  - complete Next.js production build passed with 235 pages.
- Post-deploy verification:
  - confirm local, GitHub, and server commit equality, PM2 online, and `/admin/login` HTTP 200;
  - confirm the additive migration exists before the new process starts;
  - confirm ADMIN/CS can manage, FINANCE can only view, and unrelated roles are denied;
  - create a test campaign, sync without changing a package or Session, and confirm parent and staff Mini Program items are separated by student/course;
  - confirm teacher forecast counts only date-specific availability and the existing formal scheduling availability check remains unchanged.
- Task doc: `docs/tasks/TASK-20260804-next-month-scheduling-confirmation.md`.

## 2026-08-03-r305 Ready

- Scope: make the Academic Web scheduling training executable by a completely new employee who does not yet know how to enter the scheduling workflow.
- Business impact:
  - staff now follow Dashboard → Students → Full List → search → Apply → student name → Quick Schedule as separate numbered actions;
  - existing-ticket staff now see the exact sidebar position for Scheduling Work Orders;
  - each new step includes one visible target, completion evidence, and a stop condition;
  - only `ACADEMIC_SCHEDULING_MASTER` moves to `20260803C` and a 120-minute estimate;
  - operational scheduling code, permissions, packages, finance gates, tickets, and production data remain unchanged.
- Files:
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.html`
  - `output/pdf/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.pdf`
  - `docs/assets/sop-academic-scheduling-20260803/annotated/`
  - `tests/training-center.test.ts`
- Verification before deploy:
  - 54 PDF pages, 22 Chinese steps, 22 English steps, zero blank pages, and a valid language divider;
  - four new annotated Web entry screenshots plus the existing nine scheduling workflow screenshots passed visual inspection;
  - focused training tests, all repository tests, TypeScript, production build, Mini Program audit, and `git diff --check` passed.
- Post-deploy verification:
  - confirm local, GitHub, and server commit equality, PM2 online, and `/admin/login` HTTP 200;
  - confirm ADMIN and Academic/CS users see version `20260803C`;
  - download the production PDF and confirm 54 pages plus the Students, Full List, Apply, Quick Schedule, and Scheduling Work Orders click instructions;
  - confirm unrelated module versions remain `20260803A` and non-staff access remains blocked.
- Task doc: `docs/tasks/TASK-20260803-academic-scheduling-click-entry.md`.

## 2026-08-03-r304 Ready

- Scope: rebuild the core Academic Web scheduling SOP around every routine and high-risk scheduling path in the current system.
- Business impact:
  - Academic staff receive separate instructions for first scheduling, continuation, single sessions, rescheduling, cancellation/leave, teacher replacement, conflicts, completion, and handover;
  - every step includes exact actions, completion evidence, and a stop condition;
  - all training evidence now uses the Web interface instead of Mini Program screenshots;
  - only `ACADEMIC_SCHEDULING_MASTER` moves to `20260803B` and a 90-minute estimate, so unrelated modules do not require retraining;
  - operational scheduling code, permissions, packages, finance gates, tickets, and production data remain unchanged.
- Files:
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.html`
  - `output/pdf/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.pdf`
  - `output/pdf/00-SGT网页端逐功能培训目录-中英文版-20260803.pdf`
  - `docs/assets/sop-academic-scheduling-20260803/`
  - `tests/training-center.test.ts`
- Verification before deploy:
  - 40 PDF pages, 15 Chinese steps, 15 English steps, zero blank pages, and a valid language divider;
  - nine annotated Web screenshots and representative full-page rendering passed visual inspection;
  - 22 focused training tests and all 307 repository tests passed;
  - TypeScript, the 231-page production build, the 54-page Mini Program audit, and `git diff --check` passed.
- Post-deploy verification:
  - confirm local, GitHub, and server commit equality, PM2 online, and `/admin/login` HTTP 200;
  - confirm ADMIN and CS see the new scheduling title and version `20260803B`;
  - download the production PDF completely and confirm 40 pages and required Chinese/English scheduling text;
  - confirm unrelated module versions remain `20260803A` and non-staff access remains blocked.
- Task doc: `docs/tasks/TASK-20260803-academic-web-scheduling-sop.md`.

## 2026-08-03-r303 Ready

- Scope: replace the mixed-language training-PDF format with one-function guides that contain the complete Chinese workflow first and the complete English workflow second, while separating Web and Mini Program libraries and catalogues.
- Business impact:
  - employees choose Web or Mini Program before learning and no longer jump between platforms inside one module;
  - each guide follows preparation, numbered workflow, one page per key step, save verification, stop conditions, and final sign-off;
  - 26 Web guides and 9 Mini Program guides are separately grouped and downloadable;
  - the six modules missing from the previous generator are now included, restoring 35/35 generated module files;
  - the new release version requires staff to acknowledge the current material again;
  - operational roles and permissions are unchanged.
- Files:
  - `lib/training-center.ts`
  - `app/training/page.tsx`
  - `app/training/library/page.tsx`
  - `app/api/training/catalogs/[platform]/route.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-*-20260803.html`
  - `output/pdf/*20260803.pdf`
  - `tests/training-center.test.ts`
- Verification before deploy:
  - 35 registered guide PDFs plus two platform catalogue PDFs exist;
  - 37 PDFs / 664 pages passed automated page-count, text-order, blank-page, and file-size checks;
  - all 374 referenced screenshots exist;
  - four representative contact sheets passed visual inspection;
  - 21 focused training tests and all 306 repository tests passed;
  - TypeScript, Mini Program release audit, `git diff --check`, and the complete 231-page build passed.
- Post-deploy verification:
  - confirm local, GitHub, and server commit equality, PM2 online, and `/admin/login` HTTP 200;
  - confirm ADMIN sees 26 Web and 9 Mini Program guides in separate sections;
  - confirm the two catalogue downloads and representative Web/Mini Program module downloads return PDF 200;
  - confirm non-staff access remains blocked and role filtering is unchanged.
- Task doc: `docs/tasks/TASK-20260803-step-by-step-training-library.md`.

## 2026-08-03-r302 Ready

- Scope: make manual course reminders resilient to same-day additions and frequent schedule changes, and consolidate siblings only under an explicit active parent link.
- Business impact:
  - future classes added on the class date enter the reminder queue as high priority;
  - children under the same verified parent link appear in one reminder with a visible student label on every lesson;
  - a sent reminder remains immutable and a changed course creates a high-priority correction task;
  - previously sent individual reminders are not silently replaced by a combined family reminder;
  - shared packages alone never establish a family recipient.
- Verification before deploy:
  - 21 focused communication tests passed;
  - 132 backend tests passed;
  - all 304 repository tests passed;
  - TypeScript, `git diff --check`, and the 231-page production build passed.
- Post-deploy verification:
  - confirm local, GitHub, and server commit equality, PM2 online, and `/admin/login` HTTP 200;
  - run one communication sync and confirm the future same-day Su Xinyuan class is represented without modifying its schedule;
  - confirm no automatic message-send or duplicate parent-account record is created;
  - confirm tomorrow's existing parent and teacher reminder queues remain available.
- Task doc: `docs/tasks/TASK-20260803-same-day-family-course-reminders.md`.

## 2026-07-31-r301 Ready

- Scope: include Business Accounts invoices and receipts in Finance Documents as a separate `Business / 企业账户` channel.
- Business impact:
  - Shanghai Xinzhuo Si invoices and receipts become visible in the central finance list under their true Business Account classification.
  - Date, type, channel, payment-status, keyword, and Excel export paths use the same combined rows.
  - Invoice and receipt rows open their existing Business Account PDFs and source workspace.
  - Drafts remain excluded from formal documents; issued, paid, partial, and void states remain distinguishable.
  - Existing source records and all creation, payment, approval, settlement, package, attendance, payroll, and scheduling workflows remain unchanged.
- Verification before deploy:
  - Read-only production data: three paid Shanghai Xinzhuo Si invoices and three receipts exist in Business Accounts; none exist in Partner Billing.
  - 30 focused finance and billing tests passed.
  - 301 repository tests passed.
  - TypeScript and `git diff --check` passed.
  - Complete 231-page production build passed.
- Post-deploy verification:
  - Confirm local, GitHub, and server commit equality, PM2 online, and `/admin/login` HTTP 200.
  - Confirm Business channel returns three Shanghai Xinzhuo Si invoices and three receipts.
  - Confirm the July 2026 invoice filter includes `RGT-202607-0004` for SGD 18,440.
  - Confirm the three existing source documents remain unchanged and no duplicate records are created.
- Task doc: `docs/tasks/TASK-20260731-business-finance-documents.md`.

## 2026-07-29-r300 Ready

- Scope: teacher-profile resilience, manager remediation visibility, training-PDF response improvements, and small mobile/login/browser polish fixes.
- Business impact:
  - A TEACHER account without a confirmed profile now sees a bilingual setup-required page instead of HTTP 500.
  - Managers see every unlinked TEACHER account in one warning and can enter edit mode to choose the exact profile.
  - New and edited TEACHER accounts cannot be saved without a linked profile.
  - Training PDFs retain the same authenticated role permissions and add Content-Length, ETag, one-hour private caching, and 304 revalidation.
  - Mobile language buttons no longer split inside “Apply”; login uses a native form; `/favicon.ico` is served.
  - No existing user is automatically linked, disabled, deleted, or otherwise changed.
- Files:
  - `lib/auth.ts`
  - `app/teacher/profile-required/page.tsx`
  - `app/admin/manager/users/page.tsx`
  - `app/api/admin/manager/users/route.ts`
  - `app/api/admin/manager/users/[id]/route.ts`
  - `app/api/training/sops/[code]/route.ts`
  - `app/admin/login/_components/AdminLoginClient.tsx`
  - `app/admin/_components/LanguageSelectorClient.tsx`
  - `app/teacher/TeacherLanguageSelectorClient.tsx`
  - `app/responsive-layout.css`
  - `app/favicon.ico/route.ts`
- Verification before deploy:
  - 20/20 focused training and safety tests passed.
  - TypeScript passed with a Prisma Client generated from the current schema.
  - 129/129 backend tests passed.
  - 113/113 mini-program and training-focused tests passed.
  - 298/298 integrated repository tests passed after rebasing onto the live `r299` finance release.
  - Mini-program release audit passed at 54 pages with zero errors.
  - Complete 231-page Next.js production build passed and includes `/teacher/profile-required` and `/favicon.ico`.
- Post-deploy verification:
  - Confirm local/GitHub/server commit equality, live PM2 PID, and `/admin/login` HTTP 200.
  - Confirm one unlinked TEACHER account reaches `/teacher/profile-required` rather than HTTP 500.
  - Confirm a linked TEACHER account still loads all 19 teacher/training routes.
  - Confirm manager users page lists the four existing unlinked TEACHER accounts.
  - Confirm training PDF 200 response includes Content-Length/ETag and revalidation returns 304 without changing role permissions.
  - Confirm mobile language controls, native login form, and `/favicon.ico`.

## 2026-07-29-r299 Live

- Scope: calculate new partner receipts from original invoice less issued Credit Notes.
- Business impact:
  - Selecting a source invoice immediately shows original total, issued Credit Notes and receipt net.
  - Amount, GST, Total and Amount Received update together and are read-only.
  - The server recalculates the latest issued-credit net on submit, so stale pages and edited browser values cannot restore the gross invoice amount.
  - Credit Note numbers and the net calculation are added to the receipt audit note automatically.
  - Fully credited invoices are excluded from receipt creation.
  - Existing invoices, Credit Notes, receipts, payment records and approvals are not rewritten.
- Verification before deploy:
  - 10 focused receipt and finance-document tests.
  - 295 repository tests.
  - `npx tsc --noEmit`.
  - `git diff --check`.
  - `npm run build` (229 pages).
  - Read-only production reconciliation: `RGT-202606-0019` = SGD 18,540 original - SGD 270 issued credit = SGD 18,270 net; no receipt exists.
- Post-deploy verification:
  - Runtime feature commit `152024fb2b7626b09274e68b5d0d40e291a7dee6` aligned across local, GitHub and server; PM2 PID `2211224` was online and `/admin/login` returned HTTP 200.
  - Server-side receipt calculation and read-only production reconciliation confirmed `RGT-202606-0019` = SGD 18,540 original - SGD 270 issued credit = SGD 18,270 net.
  - The existing payment proof `Beijing New Oriental-29.07.26.png` with reference `IM260729011523000` remains present and the production receipt count remains zero.
- Task doc: `docs/tasks/TASK-20260729-partner-receipt-credit-net.md`.

## 2026-07-29-r298 Live

- Scope: complete the Academic/CS role curriculum for a zero-experience employee.
- Business impact:
  - CS receives two new detailed modules for student records and teacher coordination.
  - Seven existing Academic specialist modules become visible to CS for learning and handoff competence.
  - The role path is organised into 12 functional chains.
  - ADMIN continues to supervise all modules; operational permissions are unchanged.
- Verification before deploy:
  - 35/35 bilingual PDFs exist, 365 pages total.
  - The two new ten-page guides and four-page catalogue passed rendered contact-sheet inspection.
  - Registry visibility is 35 ADMIN / 20 CS / 11 TEACHER modules.
  - 126 backend tests, TypeScript, and the complete 229-page production build passed.
- Post-deploy verification:
  - Runtime feature commit `857bb8584870fd4afd4f82a944fdd4a430adee2c`, PM2 PID `2197584`, and `/admin/login` HTTP 200.
  - Authenticated ADMIN library shows 35 modules and authenticated CS library shows 20 modules, both at release `20260729D`.
  - Both new PDFs and all seven newly assigned Academic specialist PDFs return HTTP 200 for CS.
  - CS access to `FINANCE_MASTER` and `TEACHER_REPORTS_ASSESSMENTS` returns HTTP 403.
  - Temporary production verification-session residue: 0.
- Task doc: `docs/tasks/TASK-20260729-academic-complete-training.md`.

## 2026-07-29-r297 Live

- Scope: administrator full-library oversight and a detailed teacher curriculum.
- Business impact:
  - ADMIN can view and download every training module, including teacher-only learner modules.
  - Operational business permissions remain unchanged.
  - TEACHER receives four new detailed modules for daily start, availability and scheduling exceptions, reports and assessments, and expense/payroll/payment follow-up.
  - Training release `20260729C` intentionally requires acknowledgement of the corrected and expanded content.
- Verification before deploy:
  - 15 current teacher pages captured with red bilingual callouts and zero temporary-session residue.
  - Four new 10-page teacher PDFs and the 33-module catalogue passed rendered contact-sheet inspection.
  - 33/33 bilingual PDFs exist, 345 pages total.
  - ADMIN sees 33 modules; TEACHER sees 11 relevant modules.
  - 124 backend tests passed.
- Post-deploy verification:
  - Runtime feature commit `e55fed18c7e481c320d94945f3e9ae0e3618b06f`, PM2 PID `2184481`, and `/admin/login` HTTP 200.
  - Authenticated ADMIN library shows all 33 modules, release `20260729C`, and full-library oversight; ADMIN downloads a TEACHER-only PDF with HTTP 200.
  - Authenticated TEACHER library shows 11 modules; all four new teacher PDFs return HTTP 200.
  - TEACHER access to `FINANCE_MASTER` returns HTTP 403.
  - Temporary production verification-session residue: 0.

## 2026-07-29-r296 Live

- Scope: complete parent and employee mini-program binding training, correct the parent bind route, and repair other mini-program guides whose screenshots or claimed capabilities did not match the system.
- Business impact:
  - Academic staff receive a dedicated end-to-end parent invitation and binding module.
  - Managers and employees receive a two-sided one-time staff-code binding workflow.
  - Sales training separates mobile follow-up from web conversion.
  - Finance and Full Care guides state the current native-mobile boundary and direct unavailable work to the web workbench.
  - Training release `20260729B` intentionally requires acknowledgement of the corrected content.
  - No operational role, permission, billing, receipt, package, attendance, payroll, scheduling, Full Care data, or parent-visible record changes.
- Files:
  - `app/api/admin/students/[id]/parent-portal/invites/route.ts`
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `tests/training-center.test.ts`
  - `docs/assets/sop-miniapp-binding-20260729/`
  - `docs/培训中心/`
  - `docs/tasks/TASK-20260729-training-completeness-and-miniapp-binding.md`
- Verification before deploy:
  - 122 backend tests passed.
  - TypeScript passed.
  - 229-page production build passed.
  - 29/29 bilingual PDFs exist, 305 pages total.
  - Parent binding, Finance boundary, and full catalogue rendered-page checks passed without missing screenshots or clipping.
- Post-deploy verification:
  - Runtime feature commit `2c6badf0b4fba74e2b52d0976c28863b40f83310`, PM2 PID `2169138`, `/admin/login` HTTP 200, and local/GitHub/server commit equality.
  - Authenticated `/training` and `/training/library` show 26 ADMIN-accessible modules with release `20260729B`.
  - Parent binding PDF downloads as a 1,258,187-byte `application/pdf` attachment; TEACHER access returns HTTP 403.
  - A temporary parent invite response returns `/pages/bind/bind?token=...`, followed by zero temporary invite and session residue.

## 2026-07-29-r295 Live

- Scope: HR-quality training assessment and complete role-based mini-program learning paths.
- HR improvements:
  - 28 modules are classified as foundation, role core, or specialist and show estimated time plus three learning objectives;
  - every module has a distinct role-context question set instead of one shared generic quiz;
  - practical submission is locked until reading and an 80% quiz pass;
  - practical evidence requires training-data reference, verified final state, and rubric self-check;
  - managers must confirm a four-item competency rubric;
  - rework requires specific instructions, only the current ready version can be reviewed, and self-sign-off is blocked.
- Mini-program paths:
  - common login/binding/account switching;
  - Academic/CS, Teacher, Management, Sales, Finance, Full Care, and Parent/Student Support;
  - five new nine-page bilingual beginner PDFs extend the existing three detailed mini-program guides.
- Isolation:
  - no database migration or operational permission change;
  - training roles still assign learning only;
  - no business record is changed by viewing, downloading, learning, or manager review UI.
- Verification:
  - 28/28 PDFs passed bilingual content and page checks, 296 pages total;
  - Finance mini-program nine-page contact sheet and 28-module catalogue visually passed;
  - 119 backend tests, TypeScript, and 229-page production build passed;
  - authenticated training page: 25 administrator-accessible modules, learning briefs and learning order present, 25 practical submissions correctly locked;
  - authenticated library: 25 role-allowed cards and new Finance PDF attachment HTTP 200;
  - temporary verification-session cleanup: 0 remaining.
  - production runtime feature commit `56da50e05568d5a47331a95c7c2b3e91996d3314`, PM2 PID `2145187`;
  - `/admin/login`, authenticated `/training`, and authenticated `/training/library` returned HTTP 200;
  - production training rendered 25 administrator-accessible modules with the recommended order, learning briefs, estimated time, and release `20260729`;
  - production library rendered 25 role-allowed cards;
  - the Finance mini-program PDF returned HTTP 200 as a 1,347,605-byte `application/pdf` attachment;
  - administrator access to the teacher-only PDF returned HTTP 403;
  - production temporary verification-session cleanup: 0 remaining.
- Task doc: `docs/tasks/TASK-20260729-training-hr-quality-and-miniapp-paths.md`.

## 2026-07-29-r294 Live

- Scope: zero-experience step-by-step bilingual training PDFs and an employee PDF Download Centre.
- Training material:
  - the 17 former four-page outline PDFs are now nine-page beginner guides;
  - each upgraded guide includes preparation, workflow overview, one page per key action, real annotated system screenshots, before-save review, after-save verification, stop conditions, and a final checklist;
  - the six existing detailed bilingual guides remain in place;
  - all 23 assigned PDFs now cover 251 pages and use training release version `20260729`.
- Employee access:
  - `/training` offers both View PDF and Download PDF for each assigned module;
  - `/training/library` groups all assigned PDFs by category and offers persistent view/download actions;
  - the PDF API returns `inline` for viewing and `attachment` only for an explicit download request;
  - authentication and training-role access checks remain mandatory.
- Isolation:
  - no database migration and no automatic training progress creation;
  - no system permission, training-role assignment, scheduling, finance, package, payroll, Full Care, or parent workflow changes.
- Verification:
  - 23/23 PDFs passed page-count and Chinese/English content validation, 251 pages total;
  - representative nine-page contact sheet visually passed;
  - authenticated local library: HTTP 200, 20 administrator-accessible module cards;
  - PDF inline/download headers passed, `%PDF` signature passed, unauthorised teacher-only access returned 403;
  - temporary verification-session cleanup: 0 remaining;
  - 118 backend tests, TypeScript, and the 229-page production build passed.
  - production runtime commit `3f9cfeb50a35d3bcd8a835b3c62e754224117059`, PM2 PID `2133294`;
  - production authenticated `/training/library`: HTTP 200 and 20 administrator-accessible module cards;
  - production PDF view/download: HTTP 200, `inline`/`attachment`, 1,855,674 bytes, valid `%PDF`;
  - production unauthorised teacher-only access: HTTP 403;
  - production temporary verification-session cleanup: 0 remaining.
- Task doc: `docs/tasks/TASK-20260729-beginner-training-pdfs-download-centre.md`.

## 2026-07-28-r293 Live

- Scope: make `/training/manage` a complete staff training overview instead of an empty submission-only queue.
- Business impact:
  - all non-student employees appear before they start training;
  - managers see staff count, assigned-module count, pending sign-off, completed modules, and staff not started;
  - every employee shows primary role, training roles, language, completion percentage, and module-level status;
  - approval and rework controls remain available only for a module that has completed reading, passed the quiz, and submitted practical evidence.
- Isolation:
  - no database migration and no automatic progress creation;
  - no training completion or approval state changes during page load;
  - no system permission, scheduling, finance, package, payroll, Full Care, or parent workflow changes.
- Verification:
  - production data: 56 staff, 0 training-progress rows;
  - local authenticated render: 56 employee cards and 378 assigned modules, temporary session cleanup 0;
  - production runtime feature commit: `29d2d5f13e0dc4bfe22579faf3df459822b663c6`, PM2 PID `1953887`;
  - production authenticated `/training/manage`: HTTP 200, 56 employee cards, overview heading, staff-not-started metric, and manager record present;
  - production temporary manager-session cleanup: 0 remaining;
  - 118 backend tests, TypeScript, and 228-page production build passed.
- Task doc: `docs/tasks/TASK-20260728-training-manager-overview.md`.

## 2026-07-28-r292 Live

- Scope: Chinese-English bilingual staff training across the full system.
- Business impact:
  - account language `EN` shows English, `ZH` shows Chinese, and `BILINGUAL` shows both;
  - training module names, categories, five-question quizzes, answer choices, practical tasks, manager sign-off, coverage map, and training-role assignment follow the same language;
  - all 23 modules now open a bilingual PDF, including 17 newly generated editions and six existing bilingual SOPs;
  - a new bilingual staff-training catalogue provides the controlled entry point;
  - the training release version is unified as `20260728`, so employees re-confirm the current bilingual edition.
- Isolation:
  - training roles remain learning assignments only and do not grant operational permissions;
  - no schema migration or business-data mutation;
  - no changes to scheduling, attendance, packages, contracts, finance, payroll, settlement, Full Care state, or parent visibility.
- Validation:
  - 68 new module PDF pages plus a 4-page bilingual catalogue passed text and full-page visual checks;
  - all 117 backend tests, TypeScript, and the 228-page production build passed;
  - guarded release deployed runtime commit `b048612d250e9842467763c68411dd847f939134`;
  - production PM2 PID `1939220` is online and `/admin/login` returned HTTP 200;
  - EN, ZH, and BILINGUAL staff sessions each returned `/training` 200 with the correct language combination and the common bilingual PDF returned 200;
  - temporary verification sessions were deleted with zero remaining.
- Task doc: `docs/tasks/TASK-20260728-bilingual-staff-training.md`.

## 2026-07-28-r291 Live

- Scope: production-build packaging correction for the r290 operation-map generator.
- Business impact:
  - The optional PDF build tool is no longer scanned as application TypeScript on servers that intentionally omit Playwright.
  - The r290 multi-role training and operation-coverage functionality is unchanged.
  - The first r290 deploy stopped before PM2 restart; the previously live process remained available.
- Files:
  - `scripts/build-training-operation-map.mjs`
- Verification:
  - 228-page production build passed.
  - Runtime commit `d2de30effed602d6a5d44614a76a213d5513d67d` ran as PM2 PID `1880000`; `/admin/login` returned 200.

## 2026-07-28-r290 Live

- Scope: independent multi-role training assignments plus the complete SGT employee-operation coverage map.
- Business impact:
  - Managers can add Finance, Sales, CS, Teacher or Admin training responsibilities to an employee without changing that employee's actual system permissions.
  - Every visible app page is automatically mapped to one of 16 complete business-result flows and its existing detailed or master SOP.
  - All staff receive the common operation-map module; managers can inspect coverage at `/training/coverage`.
  - No operational workflow, primary role, workspace permission or protected business data is changed.
- Files:
  - `app/admin/manager/users/*`
  - `app/training/*`
  - `lib/training-center.ts`
  - `lib/training-operation-coverage.ts`
  - `prisma/schema.prisma`
  - `docs/培训中心/*`
- Verification:
  - TypeScript, 117 backend tests, 228-page production build.
  - 144 web pages plus 54 WeChat miniapp pages, 16 operation areas, zero unmapped routes.
  - 19-page A4 landscape PDF text and full-page visual checks.
  - Migration current, local/GitHub/server aligned, PM2 online and `/admin/login` 200.
  - A temporary CS + Finance training assignment returned 200 and unlocked the protected Finance training PDF while the Finance workbench remained denied with a 307 redirect.
  - The original assignment state was restored and temporary sessions were removed.

## 2026-07-28-r289 Live

- Scope: controlled SOP library plus authenticated role-aware employee Training Center.
- Business impact:
  - Staff see only role-relevant current SOP modules and must complete reading, quiz, practical evidence and manager sign-off.
  - Managers receive a dedicated training validation queue.
  - Old manuals are explicitly stopped as current training sources.
  - No teaching, scheduling, attendance, package, finance, payroll, settlement or parent workflow changes.
- Files:
  - `app/training/*`
  - `app/api/training/sops/[code]/route.ts`
  - `lib/training-center.ts`
  - `prisma/schema.prisma`
  - `docs/培训中心/*`
- Verification:
  - focused training/migration tests, all 114 backend tests, TypeScript and the 227-page production build passed.
  - Runtime commit `49f9ff847aa1c7180f3f85818ae7d389a39d722a` ran as PM2 PID `1863191`; `/admin/login` returned HTTP 200.
  - Authenticated Admin and Teacher training pages returned 200, both roles could open an allowed protected PDF, a Teacher received 403 for a Finance-only PDF, and an anonymous PDF request received 401.
  - Production verification left the training-progress table unchanged at zero rows; no employee was automatically marked complete.

## Open Risks

- Four existing TEACHER accounts have no confirmed teacher-profile link. They are now safely gated, but a manager must identify the exact profile or decide whether each legacy account should remain inactive; the system intentionally does not guess by matching names.
- Multi-role training assignments intentionally do not grant business permissions. Managers must still change the primary role or workspace access separately when the employee genuinely needs operational access.
- Training-center rollout: no employee is automatically marked complete. Management must review the first practical evidence and establish who is responsible for each role's sign-off.
- Singapore School Guide rollout: `2026-07-27-r285` is additive and has no migration, but official school fees and admissions details remain time-sensitive. Fifteen priority schools show an applicable year, verification date and next review date; partially verified directory entries must continue to display their limitation. After server deployment, upload miniapp development version `1.0.17`, designate it as the experience version, and check the public entry, one school detail, four-school comparison, copied official link and test inquiry without exposing real child data.

## 2026-07-28-r288 Live

- Scope: make the School Guide represent the full Singapore education landscape rather than only international schools.
- Coverage: 13 sectors from preschool through autonomous universities, using MOE, ECDA, SSG/TPGateway, MUIS, IB and school-official destinations.
- UX: education-system cards appear first; the detailed international-school search, tier, comparison and plan workflow remains below.
- Miniapp: official third-party pages use copy-link behavior; the international-school card scrolls to the existing detailed directory.
- Isolation: public School Guide API and presentation only; no database migration or changes to existing parent/staff/teacher operations.
- Verification: 13 focused tests, all 273 repository tests, 225-page build, 54-page miniapp audit and 390px mobile review passed.
- Production verification:
  - Runtime commit `526ab99d6e821adf08d155fff8e027f0f9833ca8` ran as PM2 PID `1736885`.
  - `/school-guide`, `/school-guide/schools` and `/api/public/school-guide/catalog` returned HTTP 200.
  - The catalog returned data version `2026-07-28`, 13 sectors and 43 existing detailed school records.
  - WeChat development version `1.0.20` uploaded at 576,398 bytes; experience-version designation remains a manual WeChat security action.

## 2026-07-27-r287 Live

- Scope: simplify all public School Guide surfaces on web and miniapp.
- Removed: employee name, internal ownership and review language, repeated disclaimers, source-page filter, decorative compass and verbose empty states.
- Preserved: official school facts, pathways, matching reasons/cautions, plan storage, comparison, inquiry consent and privacy contact channels.
- Isolation: no database migration and no changes to parent, staff, teacher or admin workflows.
- Verification: production build, focused School Guide tests, miniapp release audit, diff check and 390px visual review.
- Production verification:
  - Runtime commit `0c2c431f8cb65f3d5741f18eae14f83a0800b3da` runs as PM2 PID `1492457`.
  - `/school-guide`, `/school-guide/assessment`, `/school-guide/cases`, `/school-guide/plan` and `/api/public/school-guide/catalog` returned HTTP 200.
  - WeChat development version `1.0.19` uploaded at 573,860 bytes; experience-version designation remains a manual WeChat security action.

- Package-ledger student-attribution rollout: `2026-07-24-r284` is live at runtime feature commit `b324c08`, with PM2 PID `99894`, health 200 and the deployed logo hash matching the approved `GTI2.png`. The release is read-only and changes only PDF rendering. Historical rows are resolved from explicit student metadata or attendance references; a deduction that cannot be matched is visibly labelled `Unresolved / 未匹配` instead of being silently attributed to the package owner. Previously downloaded PDFs are static and must be downloaded again.

## 2026-07-27-r286 Live

- Scope: upgrade the Singapore School Guide into a task-led decision workspace inspired by established study-planning products without copying their branding or data.
- Business impact:
  - Families enter through Find schools, Smart matching, Real cases, My plan and Human review.
  - Smart matching explains verified fit and cautions instead of inventing admission probabilities.
  - Favorites remain compatible and become an actionable local plan.
  - The case library stays empty until consent, anonymization and human review are complete.
- Isolation: no parent, employee, teacher, scheduling, finance, package, payroll, feedback or Ticket code paths are changed.
- Verification:
  - 10 focused school-guide tests.
  - 225-page Next production build.
  - TypeScript and diff checks.
  - 54-page miniapp release audit and JavaScript syntax checks.
- Production verification:
  - `/school-guide`, `/school-guide/assessment`, `/school-guide/cases`, `/school-guide/plan` and catalog returned HTTP 200.
  - Catalog exposed 43 school records and zero unpublished cases.
  - Runtime feature commit `085ddd03ed79ac830ad9586ae2152161926ae747` ran as PM2 PID `1466219`.
  - WeChat development version `1.0.18` uploaded at 577,499 bytes; experience-version designation remains a manual WeChat security action.

## 2026-07-27-r285 Live

- Scope: publish the official-source Singapore School Guide on web and add its public pages to the existing WeChat miniapp.
- Business impact:
  - Families can browse verified pathways and schools, compare up to four schools, estimate first-year fixed costs and submit an inquiry.
  - Existing parent, employee, scheduling, attendance, package, payroll, finance, feedback, renewal and Ticket workflows are unchanged.
- Files:
  - `app/school-guide/*`
  - `app/api/public/school-guide/*`
  - `lib/school-guide-data.ts`
  - `miniapp/boss-academic-parent/pages/guide-*`
  - `miniapp/boss-academic-parent/app.json`
- Verification before deploy:
  - 8 focused school-guide tests.
  - 109 backend regression tests.
  - 268 complete repository tests.
  - TypeScript and `git diff --check`.
  - 223-page Next production build.
  - 52-page miniapp release audit.
- Post-deploy verification:
  - `/admin/login`, `/school-guide`, `/school-guide/compare` and `/api/public/school-guide/catalog` return HTTP 200.
  - Catalog exposes verified cost and review fields.
  - Anonymous incomplete inquiry is rejected without creating data.
  - WeChat development version `1.0.17` uploaded successfully at 562,793 bytes; experience-version designation requires the administrator's manual action.

- Ticket-action workflow rollout: `2026-07-24-r283` is live at runtime feature commit `c22e7f3`, with all 112 migrations current, PM2 PID `90247` and health 200. Anonymous Ticket access redirects to login, and three existing structured Tickets retained their unresolved action states after deployment. The exact action ID and source lesson are validated inside the existing schedule transaction, so a mismatch rolls back the operation. Use the next real scheduling request for the first controlled write; do not fabricate or cancel a real lesson solely for testing.

- Shared-package student-course scope: `2026-07-23-r282` is live at runtime feature commit `8a4ed64`, with all 112 migrations current, PM2 PID `4063677` and health 200. Shared group sessions remain exceptions because their Class is common to every enrolled student; operators must review the preview before saving.

- Package-course transition rollout: `2026-07-23-r281` is live at runtime feature commit `a654dd1`, with all 112 migrations current, PM2 PID `4053092` and health 200. Academic Operations must review the preview counts before saving. Completed/protected lessons and shared group lessons remain unchanged; group lessons require individual handling because changing their shared Class would affect other students.

- Renewal-copy cleanup: `2026-07-23-r280` is live at runtime feature commit `371f547`, with PM2 PID `3996895`, health 200 and WeChat development version `1.0.16` uploaded at 529,892 bytes (517.5 KB). The page now starts directly with the title, two source queues and task metrics. Designate `1.0.16` as the experience version for physical-phone visual confirmation.

- New Oriental renewal separation rollout: `2026-07-23-r279` is live at runtime feature commit `6700864`, with PM2 PID `3981337`, health 200 and WeChat development version `1.0.15` uploaded at 530,450 bytes (518.0 KB). Production service verification returned 11 Boss/other and 9 New Oriental tasks with zero cross-cohort rows; all 9 New Oriental messages now use the project-contact template and their task statuses remain unchanged. New Oriental is detected only from the canonical `新东方学生` source channel; no names or package records were rewritten. Designate `1.0.15` as the experience version and verify both tabs on a physical phone.

- Renewal follow-up rollout: `2026-07-23-r278` is live at runtime feature commit `c431f09`, with 112 migrations current, PM2 PID `3971356`, health 200 and WeChat development version `1.0.14` uploaded at 527,564 bytes (515.2 KB). The first controlled sync created 20 open tasks: 8 exhausted, 4 red and 8 yellow; 18 await first contact and 2 are already at payment-pending. Forecasts are operational signals, not billing decisions: Emily/Eva/Jasmine must verify shared packages, paused study, gift hours, refunds and future scheduling before contacting a parent. Teachers are excluded from renewal and Student360 operations. Designate `1.0.14` as the experience version and complete an Emily/Eva/Jasmine-management physical-phone pass before broad daily use.

- Course-change resend rollout: r277 is live at runtime feature commit `95cbda7` with PM2/health checks passing. Production sync upgraded Steven's historical generic notice; Steven and 刘妍书 now explicitly say cancelled/no replacement, while Zack shows the real old/new time. WeChat development version `1.0.13` uploaded at 513,286 bytes (501.3 KB). Designate it as the experience version and test Emily/Eva on an existing task; do not fabricate a cancellation.

- Seven-upgrade miniapp rollout: `2026-07-20-r276` is live at runtime feature commit `839a459`; PM2 and health checks pass, the additive attachment table was verified directly, and WeChat development version `1.0.12` uploaded successfully at 508,918 bytes (497.0 KB). Designate it as the experience version and test Emily, Eva, Jasmine ADMIN and Jasmine TEACHER on physical phones. Direct Mini Program cards are recommended for exact deep links, but WeChat still requires the employee to choose a group/person and tap Send; retain text/image fallbacks and the manual send evidence step.

- Feedback-to-WeChat handoff rollout: `2026-07-19-r275` is live at runtime commit `93a042d` and uploaded as WeChat development version `1.0.11` (474.8 KB). Publication switches to and expands the `待发送` task, but the operator must still actually send through WeChat and confirm it. Designate `1.0.11` as the experience version and test the existing real pending feedback without fabricating a task.

- Unified Ticket-list rollout: `2026-07-19-r274` is live at runtime commit `ec0716a` and uploaded as WeChat development version `1.0.10` (473.1 KB). Production read-only checks show matching action-centre/list counts of 8, while anonymous access remains 401. Designate `1.0.10` as the experience version and verify one `自营学生` Ticket and one `家长小程序` Ticket on a physical phone.

- Reminder brand/web-entry rollout: r273 is live at runtime commit `67e6add`; production sync is healthy with 12/12 parent reminders using the parent miniapp, 8/8 teacher reminders offering employee miniapp plus `sgtmanage.com/teacher`, zero false corrections and zero superseded reminders. Previously downloaded images remain static and must be downloaded again.

- Reminder brand/web-entry rollout: `2026-07-19-r272` is ready after 221 repository tests, the 208-route build and visual inspection of both reminder images. Existing downloaded images are static and need to be downloaded again; teachers may use employee miniapp or `sgtmanage.com/teacher`, while parents/students remain on the parent miniapp because there is no secure parent web portal.

- Communication-workbench rollout: `2026-07-19-r271` is live at runtime feature commit `612ac05` and uploaded as WeChat development version `1.0.9` (471.7 KB). Server-side production verification passed for real date-explicit reminders, honorific normalization, false-correction prevention, attachment projection and authentication rejection. Designate `1.0.9` as the experience version, then complete a physical-phone pass for Emily, Eva and both Jasmine accounts, including opening one real Ticket attachment; do not create fabricated business records solely for testing.

- Reminder share-image CJK rollout: `2026-07-19-r270` is live at runtime feature commit `5aa3627`; production font matching and a real parent-reminder render passed. Images downloaded before the release are static files and must be downloaded again to receive the corrected rendering.

- Employee action-centre rollout: `2026-07-19-r269` is live at runtime feature commit `72e6695` and uploaded as WeChat development version `1.0.8` (463.5 KB). Designate `1.0.8` as the experience version and run one controlled physical-phone pass for Emily, Eva and both Jasmine accounts. Complex receipt/finance reconciliation remains on web; consultation screenshots are retained but are not OCR-parsed. Do not fabricate payroll, approval, lead, feedback or schedule data solely for testing.

- Parent-communication rollout: `2026-07-18-r267` is live at `474e40c` and uploaded as WeChat development version `1.0.7` (416.7 KB). Designate `1.0.7` as the experience version, then complete one physical-phone pass with Emily, Eva and Jasmine: review/publish one controlled feedback, copy and manually send one family/teacher reminder, upload an album screenshot, confirm the audit trail, and verify a schedule change creates or refreshes the correction task. Do not fabricate payroll, feedback, family or schedule data solely for testing.

- Guided-intake and miniapp-audit rollout: `2026-07-18-r266` is live at runtime feature commit `f7c78bb` and uploaded as WeChat development version `1.0.6` (403.0 KB). Emily's existing live token already renders the guided title without creating data. Designate `1.0.6` as the experience version, then use the first controlled real intake to confirm exact actions and the `MINIAPP` audit row. GET reads and pre-session login attempts are intentionally not logged.

- Scheduling work-order rollout: `2026-07-18-r265` is live at runtime feature commit `421b4e7` and uploaded as WeChat development version `1.0.5` (401.3 KB). Historical Tickets are intentionally not backfilled and appear as `待结构化`; designate `1.0.5` as the experience version, then verify the first Emily multi-action Ticket and the first cancellation-plus-replacement flow on a physical phone. The Ticket must remain open after cancellation until replacement scheduling is applied.

- Emily request-intake rollout: `2026-07-18-r264` is live at runtime feature commit `21310b2` and uploaded as WeChat development version `1.0.4` (388.1 KB). Historical low-risk Tickets whose owner text does not exactly match Emily's user display name will remain manager-closeable. Designate `1.0.4` as the experience version and verify the no-submit form flow plus one controlled real low-risk completion when available.
- Miniapp teacher-daily-workspace rollout: `2026-07-18-r263` is live at runtime feature commit `e0cdecb` and uploaded as WeChat development version `1.0.3` (378.9 KB). Jasmine's July payroll is not published, so physical-phone testing must first verify the safe unavailable state and must not fabricate payroll data. Designate `1.0.3` as the experience version and validate one real published payroll acknowledgement when available, the 39-student access boundary, one cross-teacher feedback timeline and both attachment sources.
- Miniapp multi-account rollout: `2026-07-18-r262` is live at runtime feature commit `960457f` and uploaded as WeChat development version `1.0.2` (355.4 KB). Existing bindings are preserved, but sessions created before deployment must re-login once before account switching is available. Designate `1.0.2` as the experience version, bind Jasmine's currently unbound ADMIN account from her already-bound TEACHER WeChat, then confirm both directions preserve the correct workbench and permissions.
- Miniapp role-home UI rollout: `2026-07-17-r261` is live at runtime feature commit `e4edbb4` and uploaded as WeChat development version `1.0.1` (345.8 KB). Shared native styles and the parent/employee entry pages changed, while web pages, APIs and business writes remained untouched. Before formal review, designate the upload as an experience version and validate a manager, CS/academic, teacher, normal-course parent and Full Care parent on physical phones; confirm long names, zero counts, overdue states, the teacher next-lesson link and return refresh.

- Miniapp calendar Ticket-queue rollout: `2026-07-17-r260` is live on the server and uploaded as WeChat development version `1.0.0` with a read-only embedded queue, filters and detail deep links. Production currently has 6 open scheduling Tickets and all 6 are overdue. Time-change, teacher-change and leave/cancellation Tickets remain labelled `待关联原课程` until phase two adds explicit original-Session linkage. Set this upload as the experience version, then validate ADMIN and CS visibility, long-list scrolling, filters, return refresh and confirmation that teachers do not see the global queue.
- Parent-miniapp reassurance rollout: `2026-07-17-r259` is live on the server at runtime commit `931edbd`; production has 107 current migrations, PM2 is online with zero restarts and health is 200. Server API and source deployment do not publish the native WeChat package. After upload, complete a physical-phone pass for a normal-course parent, a pre-university Full Care parent, a restricted-permission link and a multi-student family. No WeChat Developer Tools installation is available in the current Codex runtime.
- Full-care-sidebar monitoring: `2026-07-17-r258` is live. Authenticated production screenshots confirm the complete Admin menu and active Full Care link; the code continues to select Finance and resource-only menus by role rather than Care route. The refreshed 22-page SOP matches the live desktop/mobile UI and temporary fixture residue is zero.
- Full-care-UI monitoring: `2026-07-17-r257` is live and presentation-only. Authenticated production checks passed the care home, quality dashboard, project, operations and report pages on desktop and 390px mobile with HTTP 200, no console errors and no horizontal overflow. Monitor the first staff use of long forms and dense project data; existing CARE actions and all teaching/finance boundaries remain unchanged.
- Full-care-complete-V1 monitoring: `2026-07-16-r256` is live and isolated from teaching and finance. Migration, desktop/mobile pages, parent question permission/closure, privacy, QA cleanup and 22-page SOP checks pass. Staff should now use the SOP to configure students one by one; no real student was automatically enrolled. Monitor the first real risk escalation, backup handover, parent question and service review instead of bulk-enabling students.

- Finance-documents Credit Note risk: `2026-07-16-r253` is read-side only, but Finance should confirm the first live screen and Excel view use SGD 18,270 as the adjusted and remaining amount for `RGT-202606-0019`. Issued notes affect adjusted balances; void notes are audit-only; drafts stay excluded.
- Formal-care-report rollout risk: `2026-07-16-r255` is isolated from teaching and finance, but the first real report should be reviewed for source quality, parent wording and acknowledgement before expanding the pilot beyond 5 to 10 selected students.
- Miniapp direct-scheduling rollout risk: `2026-07-14-r252` is live on the server. Server-side validation, production build, cancellation audit and read-only data checks pass, but the new 28th miniapp page still needs one WeChat Developer Tools and physical-phone pass after the experience version is uploaded. Verify ADMIN direct scheduling preview/apply and CS explicit coordination creation; merely opening and returning must leave Ticket counts unchanged.
- Partner-credit-note monitoring: `2026-07-14-r251` is live. Drafts remain excluded from adjusted totals; issued non-void notes are the only credits counted. Existing receipts are intentionally not rewritten and must be reviewed by Finance if the credited invoice already has a receipt. The first real issue remains pending. A long-number production PDF passed without header overlap, and all SOP demo records were cleaned to zero.
- University-care monitoring: `2026-07-14-r249` is live. Management reviewed the existing Li Chenghao NUS draft on 2026-07-14 and explicitly aligned it to the five current university-academic scopes, milestone/monthly cadence and Jasmine ownership; its earlier pre-university life-care scopes are no longer active. It remains a draft and must not be activated until degree/programme, current term and expected graduation are completed. Adult-student consent remains not recorded, so parent-report eligibility is still blocked. Louis remains an active pre-university full-care project and is now aligned to the complete eight-scope standard.
- Full-care-evidence monitoring: `2026-07-14-r248` is live. Parent delivery is intentionally disabled; a file marked `PARENT` is only eligible for a later reviewed report. Monitor the first real school-email upload and confirm the intended care team can open it while unrelated staff cannot.
- Parent-service-progress rollout risk: all 88 students currently have a null service type, so the parent app temporarily uses ordinary-course wording without changing the database. Management must classify students before academic-management/full-care-specific communication is relied upon. Full-care records remain invisible until explicitly published to parents. Complete a physical-phone pass after the next experience-version upload.
- Visual-scheduling-calendar rollout risk: `2026-07-13-r246` is live and adds a 42-day miniapp range query, operational overlap indicators, and teacher free-slot display. Single-query relation loading reduced the production 42-day request from 62.64 seconds to 9.98 seconds, but the Hong Kong application server to Singapore database path still leaves an 8-10 second baseline and should be addressed as a separate infrastructure project. It does not add a write path. Complete one physical-phone pass for month/week/day switching, filters, lesson opening, and date/time handoff before relying on it for daily scheduling.
- Login-portal experience risk: `2026-07-13-r245` removes the employee entry from authenticated parent pages and adds parent logout. Remembered-portal auto-entry, logout confirmation/session cleanup, and the final parent-only phone experience still need one physical-phone pass after uploading the next experience version.
- Admin-workspace-context monitoring: `2026-07-13-r242` is live. The shared route-sensitive text now follows `usePathname`; authenticated production regression passes Full Care to Student Sources and back without a hard refresh.
- Shared-package student-scope monitoring: `2026-07-13-r241` is live and its authenticated Daisy/Louis production API check passes. The explicit Session student is authoritative for capacity-one parent schedule, feedback, and reminder reads; package finance documents remain owner-scoped and were intentionally not broadened.
- Full-care-action monitoring: `2026-07-13-r240` is live. The module-level Server Action helper passed real production-mode submissions before deploy; post-deploy health checks and protected-data baselines pass. No pilot engagement exists yet, and parent publishing remains disabled.
- Full-care-core monitoring: `2026-07-13-r238` is live with five isolated care tables and `/admin/care`. The latest read-only snapshot shows 1 manually created engagement and 1 activity, with 0 plans and 0 tasks; teaching and finance baselines remain separate and preserved.
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

## 2026-07-24-r284 Ready

- Scope: use the approved GTI2 logo in package-ledger PDFs and identify the student associated with each shared-package deduction or rollback.
- Business impact:
  - Finance and Academic Operations can distinguish siblings or other students sharing one balance pool on every deducted transaction row.
  - Current deduction metadata and historical attendance-repair references both resolve to the matching student name.
  - Shared-package summaries list the package owner and shared students without duplicate names.
  - Internal `studentId` and `attendanceId` metadata are removed from the displayed note; unmatched deductions are explicitly labelled instead of silently assigned.
  - Package transactions, balances, attendance deductions, scheduling, invoices, receipts, payroll and partner settlement remain unchanged.
- Files:
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `lib/package-ledger-detail.ts`
  - `public/GTI2.png`
  - `tests/package-ledger-detail.test.ts`
- Verification before deploy:
  - 5 focused package-ledger tests
  - 260 repository tests
  - `npx tsc --noEmit`
  - `git diff --check`
  - `npm run build` (213 routes)
- Post-deploy verification:
  - Confirm local, GitHub and server commits are identical, PM2 is online and `/admin/login` returns HTTP 200.
  - Confirm the server contains `public/GTI2.png` and the deployed route references it.
  - Download a fresh shared-package ledger and confirm the header logo and per-row student labels.

## 2026-07-24-r283 Ready

- Scope: reduce the admin Ticket detail page to one request summary, one primary action per structured scheduling item and one collapsed advanced area, while keeping schedule mutation and Ticket-action completion in the same database transaction.
- Business impact:
  - Academic Operations can process each parent request from one visible action list instead of switching between duplicate status and edit panels.
  - New lesson, reschedule, cancellation and teacher-replacement actions return to the originating Ticket and record the exact result and audit event.
  - Multi-action Tickets remain open until every action is applied or cancelled; closed Tickets and mismatched lessons/actions reject the write.
  - Existing standalone scheduling, miniapp execution, finance, contracts, package balances, attendance deduction rules, receipts, payroll and partner settlement remain unchanged.
- Files:
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/students/[id]/sessions/cancel/route.ts`
  - `app/api/admin/students/[id]/sessions/replace-teacher/route.ts`
  - `lib/ticket-scheduling-action-write.ts`
  - `tests/ticket-scheduling-action-write.test.ts`
  - `tests/ticket-scheduling-actions.test.ts`
- Verification before deploy:
  - 16 focused Ticket tests
  - 257 repository tests
  - `npx tsc --noEmit`
  - `git diff --check`
  - `npm run build` (213 routes)
- Post-deploy verification:
  - Confirm local, GitHub and server commits are identical, PM2 is online and `/admin/login` returns HTTP 200.
  - Confirm anonymous Ticket routes redirect to login and the Ticket list/detail routes return normally after authentication.
  - Read one existing structured multi-action Ticket and confirm unresolved actions remain visible without changing production data.

## 2026-07-23-r278 Ready

- Scope: forecast low-balance/expiry risk and carry each package through one auditable renewal follow-up task.
- Business impact:
  - Emily, Eva and Jasmine receive a visible miniapp/web queue with owner, next follow-up, parent response, WeChat evidence, contract, payment and activation stages.
  - Student360 and the manager health dashboard show the same open renewal source of truth.
  - Teachers receive no renewal notification and cannot access student balance, family contact or renewal operations.
  - Existing package deduction, scheduling, attendance, contract signing, invoice, receipt, payroll and settlement writes are unchanged.
- Files:
  - `prisma/migrations/20260723090000_add_renewal_followup_center/migration.sql`
  - `lib/renewal-management.ts`
  - `scripts/sync-renewal-tasks.ts`
  - `ops/server/scripts/setup_renewal_followup_cron.sh`
  - `app/admin/renewals/*`
  - `app/api/miniapp/staff/renewals/*`
  - `miniapp/boss-academic-parent/pages/staff-renewals/*`
  - `tests/renewal-management.test.ts`
- Verification before deploy:
  - `npx tsc --noEmit`
  - 31 focused tests and 100 backend regression tests
  - `npm run build` (213 routes)
- Post-deploy verification:
  - Confirm the additive migration and unique open-task index.
  - Run one real read/sync and report task counts by risk/status without changing packages or schedules.
  - Confirm anonymous and teacher renewal/student-operations requests are rejected.
  - Confirm local/GitHub/server commit equality, PM2 online and `/admin/login` HTTP 200.

## 2026-07-19-r273 Live

- Scope: restore communication sync and distinguish reminder copy changes from real course changes.
- Safety:
  - semantic comparison uses only time-prefixed course lines
  - presentation flags are removed before Prisma create/upsert data
  - production repair is exact-ID and conditional on zero correction children
- Verification before deploy:
  - 13 focused communication tests, all 222 repository tests, TypeScript and the 208-route build passed
  - regression proves portal URL additions remain presentation-only and real time changes do not
- Post-deploy verification:
  - exact conditional repair cleared one accidental `supersededAt` after confirming zero correction children
  - communication sync completed successfully for 20 reminders
  - 12/12 parent and 8/8 teacher reminders contain their role-correct access paths
  - false correction and superseded-reminder counts are both zero
  - runtime commit `67e6add` aligned local/GitHub/server; PM2 PID `2516152`, admin health 200 and teacher authentication redirect 307

## 2026-07-19-r275 Live

- Scope: make teacher-feedback publication a visible two-stage workflow: publish to parent miniapp, then manually send to the family WeChat group.
- Business impact:
  - Publishing from the `待审核` filter automatically switches to `待发送` and keeps the same feedback expanded.
  - The miniapp displays numbered copy/image/evidence/confirmation actions and states that miniapp publication does not replace WeChat-group delivery.
  - Existing manual-send audit, group-name memory and feedback-forwarded records remain the source of truth.
- Files:
  - `miniapp/boss-academic-parent/pages/staff-communications/staff-communications.js`
  - `miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxml`
  - `miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxss`
  - `tests/parent-communication-center.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/parent-communication-center.test.ts tests/miniapp-action-center.test.ts`
  - `npm run miniapp:audit-release`
  - `npm run build`
- Post-deploy verification:
  - Runtime commit `93a042d` aligned locally, on GitHub and on the server; PM2 PID `2570983` was online and `/admin/login` returned HTTP 200.
  - Anonymous communication reads and writes both returned HTTP 401.
  - WeChat development version `1.0.11` uploaded at 486,190 bytes (474.8 KB).

## 2026-07-19-r274 Live

- Scope: make the employee “工单待处理” count and destination use the same all-source Ticket scope.
- Business impact:
  - Emily, Eva and management can see every open Ticket counted by the unified action centre, with source, type, status, owner and readable update time.
  - Parent-facing request reads and notifications remain restricted to `家长小程序` Tickets; no scheduling, attendance, package, finance or payroll write changes are included.
- Files:
  - `app/api/miniapp/staff/_lib.ts`
  - `app/api/miniapp/staff/parent-requests/route.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/route.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/attachments/route.ts`
  - `lib/miniapp-parent-requests.ts`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `tests/miniapp-action-center.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/miniapp-action-center.test.ts tests/miniapp-emily-request-intake.test.ts tests/miniapp-first-scheduling.test.ts tests/ticket-scheduling-actions.test.ts`
  - `npm run build`
- Post-deploy verification:
  - Runtime commit `ec0716a` aligned locally, on GitHub and on the server; PM2 PID `2544876` was online and `/admin/login` returned HTTP 200.
  - Production action-centre and unified-list open counts both equal 8 without mutating Ticket data: 7 `自营学生` and 1 `家长小程序`.
  - Both unauthenticated staff-list variants returned HTTP 401.
  - WeChat development version `1.0.10` uploaded at 484,435 bytes (473.1 KB).

## 2026-07-19-r272 Ready

- Scope: Chinese reminder branding plus role-correct miniapp/web schedule access wording.
- Business impact:
  - parent and teacher reminder images show “博思学业管家” instead of `BOSS EDUCATION`
  - teacher reminders provide both employee-miniapp and existing teacher-web access
  - parent/student reminders explicitly point to the complete schedule in the parent miniapp
  - the admin communication workspace displays the same access guidance and teacher-web link
- Safety:
  - no new parent web route or public schedule page
  - no scheduling, reminder timing, recipient, permission, attendance, package, finance or payroll change
  - unchanged lesson lines remain presentation-only updates and do not create false corrections
- Verification before deploy:
  - 12 focused tests and all 221 repository tests passed
  - TypeScript, 41-page miniapp audit and 208-route production build passed
  - both 1080×1440 audience images passed visual inspection
- Post-deploy verification:
  - local/GitHub/server commit equality, PM2 online and `/admin/login` HTTP 200
  - controlled reminder sync updates brand/access presentation without creating correction tasks
  - `/teacher` responds through the existing teacher web authentication flow

## 2026-07-19-r271 Live

- Scope: date-explicit role-aware communication work queues, complete feedback review and authenticated staff Ticket attachments.
- Business impact:
  - reminder cards, copy and images use an absolute Singapore date with weekday
  - teacher names already ending in “老师” keep a single honorific in generated reminders and recipient labels
  - feedback review shows seven required items and blocks incomplete publication
  - Feedback, Parent, Teacher and Correction work no longer share one expanded list
  - existing staff-uploaded Ticket screenshots appear as previewable attachments and every upload/view is audited
- Safety:
  - no business-data migration or historical rewrite
  - no Session, attendance, finance, package, payroll or scheduling-action mutation
  - unchanged reminder session lines are treated as presentation-only wording updates to avoid false corrections
  - old Ticket proof URLs remain compatible
- Verification before deploy:
  - focused regressions and all 220 repository tests passed
  - TypeScript, native miniapp JavaScript, 41-page miniapp audit and 208-route build passed
  - WeChat CLI preview passed at 483,000 bytes (471.7 KB)
  - production read-only compatibility check found 0 incomplete open feedback reviews and 2 attachment URLs on 1 Ticket
- Post-deploy verification:
  - runtime feature commit `612ac05` matched local/GitHub/server, PM2 PID `2478563` was online and `/admin/login` returned HTTP 200
  - all 20 inspected real parent/teacher reminders contained `2026年7月20日（周一）`; duplicate honorific and false correction counts were both zero
  - employee communication, Ticket detail and Ticket attachment routes rejected unauthenticated requests with HTTP 401
  - existing production Tickets retained their attachment projections without rewriting proof data
  - WeChat development version `1.0.9` uploaded at 483,043 bytes (471.7 KB)
  - generated parent and teacher reminder images passed visual inspection with readable Chinese and audience-correct footers

## 2026-07-19-r270 Live

- Scope: make downloaded parent reminder images reliably readable on the Ubuntu production host.
- Business impact:
  - Chinese reminder text renders as Chinese instead of Unicode/tofu boxes.
  - English words stay intact and use the available card width.
  - Long titles can occupy two lines without colliding with the body.
- Safety:
  - no reminder content, recipient, timing or state transition change
  - no mini-program/web UI change
  - no database migration or business-data write
  - deployment installs the Ubuntu Noto CJK package only when Chinese font coverage is absent and verifies the expected family before continuing
- Verification before deploy:
  - current production font inventory confirms the missing CJK dependency
  - current reminder data re-rendered locally with correct Chinese and wrapping
  - 7 focused tests, all 86 backend tests, TypeScript, shell syntax and the 208-route production build passed
- Post-deploy verification:
  - `fc-match "Noto Sans CJK SC"` returned `NotoSansCJK-Regular.ttc`
  - a real `COURSE_REMINDER_PARENT` record generated a visually checked 1080×1440 PNG with readable Chinese, intact English words and correct title/body/footer spacing
  - runtime feature commit `5aa3627`, PM2 PID `2400607` and `/admin/login` HTTP 200

## 2026-07-19-r269 Live

- Scope: add unified actions, Student 360, operation correction, mobile management approvals, fast lead intake and Teacher communications/reports to the existing employee mini program.
- Business impact:
  - Emily and Eva receive obvious role-aware entries for daily actions, student context, new consultation capture and auditable correction requests.
  - Jasmine's Management account can review suitable high-frequency approvals; her Teacher account sees payroll, lesson obligations, notices, management feedback and reports in one action centre.
  - Teachers can view only students established by their teaching history, while Academic/Management retain parent-contact and Ticket context.
  - New consultations can retain album/WeChat screenshots and create a scheduling-coordination Ticket without directly writing a Session.
- Safety:
  - no database migration or existing web UI change
  - no direct scheduling write from Lead or correction flows
  - existing guarded approval, Teacher report and role/session checks remain authoritative
  - no attendance deduction, package balance, finance calculation, payroll calculation or settlement rule changes
- Verification before deploy:
  - 34 focused tests, all 84 backend regression tests, native JavaScript, WXML compatibility scan and TypeScript passed
  - 208-page production build and 41-page mini-program release audit passed
  - Management and Teacher local API smoke tests returned 200 for all role-appropriate reads; invalid writes returned 400; temporary sessions remaining: 0
  - WeChat Developer Tools preview passed at 463.5 KB
- Post-deploy verification:
  - runtime feature commit aligned at `72e6695`; PM2 PID `2389459` online; `/admin/login` HTTP 200
  - all nine authenticated read-only Management/Teacher role checks returned 200; temporary sessions remaining: 0
  - WeChat development version `1.0.8` uploaded successfully at 463.5 KB

## 2026-07-18-r268 Live

- Scope: publish three role-specific bilingual miniapp SOPs with real WeChat DevTools screenshots and red callouts.
- Deliverables:
  - Teacher: 14 pages covering identity, workbench, tasks, lessons, attendance/feedback, cross-teacher history, payroll, availability and dual-account switching.
  - Academic Operations: 18 pages covering guided Ticket intake, album/WeChat attachments, scheduling work orders, feedback review/publication, manual WeChat evidence, reminders, corrections and daily handover.
  - Management: 14 pages covering backlog/exception oversight, scheduling, SLA, incident response, Jasmine dual identities, permissions and escalation.
- Safety: temporary training CS, ADMIN and TEACHER users plus miniapp sessions were deleted after automated capture; no real business record was created or edited.
- Validation: 46 total PDF pages rendered; required bilingual terms were extracted successfully and contact-sheet review found no blank or clipped pages.

## 2026-07-18-r267 Live

- Scope: unify feedback review, parent publication, automatic reminders and manual WeChat follow-up for Emily and Eva.
- Business impact:
  - Emily and Eva share one claimable work queue for pending feedback, tomorrow's family/teacher reminders, failed automation and correction notices.
  - Teacher submissions stay private until academic review; teacher original text remains read-only while the parent-facing version is separately editable.
  - Parent-miniapp publication, automatic WeChat delivery and manual group forwarding are shown as independent statuses.
  - Staff can copy bilingual group text, download a share image, upload an album screenshot and confirm the real group/direct-message send.
  - A sent reminder that later changes or disappears automatically creates a high-priority correction task and invalidates the stale automatic notification.
  - Each claim, transfer, review, return, publish, copy, manual send, screenshot, retry, skip and automated delivery outcome is retained in audit history.
- Safety:
  - existing formal feedback is backfilled as published and remains parent-visible
  - new feedback notification moves from teacher-submit time to Emily/Eva publish time
  - CS access is limited to the communication/mobile workspace; notification templates and global settings remain admin-only
  - no existing Session schedule write, attendance deduction, package, invoice, receipt, payroll or settlement rule changes
- Verification:
  - Prisma validation, TypeScript, 8 focused tests, all 84 backend tests, 35-page miniapp audit, native JavaScript/cron checks and the 203-page production build passed.
  - Standard release aligned local/GitHub/server at `474e40c`; all 110 migrations are applied, PM2 PID `2163400` is online, `/admin/login` returns `200`, and the existing five-minute cron now includes `communications:sync` exactly once.
  - WeChat development version `1.0.7` uploaded successfully at 416.7 KB.
  - Real production Playwright screenshots, red callouts and PDF validation passed for 13-page Teacher, 17-page Academic Operations and 14-page Management bilingual SOPs.

## 2026-07-18-r266 Live

- Scope: close the remaining web-intake gap and add a uniform miniapp mutation audit trail.
- Business impact:
  - Emily's existing intake URL now starts with student selection, one-or-more scheduling actions, exact source lesson, parent message and attachments
  - the legacy detailed form remains available for non-scheduling tickets
  - web-created actions enter the same scheduling workbench and the intake-agent board shows resolved/total action counts
  - every authenticated miniapp POST/PATCH/PUT/DELETE/upload records actor, path, outcome, status and redacted request/response context in the existing audit report
- Safety:
  - source Sessions are server-validated against the selected student
  - reschedule and teacher-replacement actions no longer appear ready before the requested time or target teacher is known
  - generic logging is fire-and-forget on the client and cannot make the original business action fail
  - no database migration or protected finance/attendance/package/payroll behavior changes
- Verification:
  - focused tests `8/8`; miniapp/WeChat/scheduling tests `64/64`; backend tests `79/79`
  - TypeScript, all native JavaScript, 34-page miniapp audit, 200-page build and diff checks pass
  - runtime feature commit `f7c78bb`; 109 migrations current with none pending; PM2 PID `2145519`; `/admin/login` 200
  - existing active intake token renders the guided title; invalid-token session lookup returns 403
  - unauthenticated operation logging returns 401; no production test Ticket/action was created and action count remains zero
  - WeChat development version `1.0.6` uploaded at 403.0 KB; experience/production designation remains manual

## 2026-07-18-r265 Live

- Scope: make scheduling Tickets executable multi-action work orders across the web desk and employee miniapp.
- Business impact:
  - Emily selects the student, operational intent and exact source lesson, and can split one parent message into several actions
  - Eva and Jasmine receive one queue for missing information, parent/teacher waiting, ready and conflict actions
  - cancellation plus replacement stays open after cancellation until the replacement Session exists
  - old scheduling Tickets remain readable and are labelled for manual structuring rather than guessed
- Safety:
  - migration adds only `TicketSchedulingAction`; no existing business column is altered
  - actual Session writes remain ADMIN-only and use existing package/finance, qualification, availability, conflict, preview and transaction checks
  - web list, web detail and miniapp all block manual Ticket completion while structured actions remain open
  - no historical Ticket or Session is automatically changed
- Verification:
  - focused tests `5/5`; miniapp/WeChat tests `56/56`; backend tests `79/79`
  - TypeScript, all native JavaScript, 34-page miniapp audit, Prisma validation, 199-page build and diff checks pass
  - runtime feature commit `421b4e7`; 109 migrations current with none pending; all 6 expected new-table indexes present
  - local/origin/server feature commits aligned; PM2 PID `2133958`; `/admin/login` 200
  - unauthenticated scheduling-action write returns 401; no production test Ticket or synthetic action was created
  - WeChat development version `1.0.5` uploaded at 401.3 KB

## 2026-07-18-r264 Live

- Scope: simplify Emily's native-miniapp Ticket intake and narrow final-close authority.
- Business impact:
  - the CS home shows one dominant orange “立即录入工单” action
  - intake is a three-step flow with optional operational settings hidden by default
  - internal message and parent-visible summary are visually separated
  - Emily can follow any visible request but completes only her own low-risk requests
  - management completes complaints, finance, school affairs and non-owned requests
- Safety:
  - backend authorization enforces the close boundary independently of the UI
  - only ADMIN can reassign an existing request
  - no web page, migration, parent visibility, notification or protected workflow changes
- Verification:
  - focused tests `3/3`; complete miniapp tests `49/49`; backend tests `79/79`
  - TypeScript, native JavaScript, 198-page build and diff checks pass
  - runtime feature commit `21310b2`; 108 current migrations; PM2 PID `2109211`; health 200
  - anonymous request-detail access returns 401
  - WeChat development version `1.0.4` uploaded at 388.1 KB

## 2026-07-18-r263 Live

- Scope: complete the teacher's daily native-miniapp workbench without changing web pages.
- Business impact:
  - teachers can review and acknowledge an existing published payroll statement
  - teachers can review parent-facing history from all teachers for students they have actually taught
  - payroll, attendance, feedback, rejected expenses and unread handover feedback appear in one todo entry
  - staff can choose Ticket screenshots from the phone album or files from WeChat chats
- Safety:
  - exact TEACHER role and linked teacher profile are required
  - no published payroll means no confirmation action
  - taught-student history is derived from attendance/class relationships and capped
  - no web page, migration, payroll calculation, scheduling, package, finance or parent access change
- Verification:
  - focused tests `5/5`; complete miniapp tests `46/46`; backend tests `79/79`
  - TypeScript, 198-page build, native JavaScript and diff checks pass
  - guarded runtime alignment at `e0cdecb`; 108 current migrations; PM2 PID `2086282`; health 200
  - all three anonymous teacher API checks return 401
  - WeChat development version `1.0.3` uploaded at 378.9 KB
  - read-only Jasmine production scope: 39 students, 1,136 feedbacks, July payroll unavailable

## 2026-07-18-r262 Live

- Scope: let one verified WeChat bind and switch between multiple existing employee accounts without merging roles or audit identities.
- Business impact:
  - Jasmine can keep the existing ADMIN and TEACHER web accounts and select the correct workbench inside one miniapp.
  - Initial WeChat login presents an account choice when more than one binding exists.
  - The employee home exposes account management, additional binding and in-app switching.
  - Existing single-account employees continue directly into their current workbench.
- Safety:
  - account switching is restricted to active bindings for the current session's verified WeChat OpenID
  - existing binding rows and existing web accounts are preserved
  - old employee sessions continue to work but must re-login before switching
  - no web login, role, teacher profile, scheduling, attendance, package, finance, payroll or parent behavior changes
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260718090000_add_staff_miniapp_multi_account/migration.sql`
  - `lib/miniapp-staff.ts`
  - `app/api/miniapp/staff/accounts/route.ts`
  - `app/api/miniapp/staff/auth/*`
  - `miniapp/boss-academic-parent/pages/staff-login/*`
  - `miniapp/boss-academic-parent/pages/staff-account-switch/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `tests/miniapp-staff-multi-account.test.ts`
- Verification:
  - Prisma generate/validate and exact production-index inspection
  - focused multi-account tests `4/4`
  - complete miniapp tests `41/41`
  - backend tests `79/79`
  - TypeScript and 195-page production build
  - WeChat Developer Tools preview and development upload `1.0.2`, 355.4 KB
  - guarded local/GitHub/server alignment at runtime feature commit `960457f`
  - completed production migration, nullable session OpenID column and composite binding indexes
  - PM2 online at PID `2073081`; `/admin/login` => `200`; anonymous account-list access => `401`
  - read-only production verification preserves Jasmine's existing TEACHER binding and leaves ADMIN unbound for explicit one-use-code confirmation
- Remaining rollout gate:
  - designate `1.0.2` as the experience version and complete a physical-phone Jasmine ADMIN/TEACHER switch test

## 2026-07-17-r261 Live

- Scope: create the shared native-miniapp UI foundation and role-aware parent/employee entry experience.
- Business impact:
  - Managers see overdue scheduling and reminder exceptions first.
  - Academic/CS staff see parent requests, scheduling work and students needing attention first.
  - Teachers see their next lesson and teaching actions first.
  - Parents retain the existing permission-aware reassurance flow with a calmer visual hierarchy.
  - No web page, API, database, role permission or business write changes.
- Files:
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/app.wxss`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/home/*`
  - `tests/miniapp-role-home-ui.test.ts`
- Verification before deploy:
  - focused role-home/login/calendar tests.
  - 30-page miniapp release audit.
  - full miniapp/backend tests, JavaScript syntax, TypeScript, production build and explicit no-web diff check.
- Post-deploy verification:
  - Local/GitHub/server aligned at runtime feature commit `e4edbb4`; PM2 PID `1721052` is online and HTTP health is 200.
  - WeChat development version `1.0.1` uploaded successfully at 345.8 KB.
  - Representative physical-phone role checks remain before formal review.

## 2026-07-17-r260 Live

- Scope: place the existing scheduling Ticket queue inside the month/week/day staff-miniapp calendar.
- Business impact:
  - Eva and Jasmine can see open and overdue scheduling work beside the formal lesson calendar.
  - Status, overdue, owner and student/course/ticket-number filters reuse the current miniapp coordination endpoint.
  - Ticket taps open the existing coordination detail and guarded scheduling panel; returning refreshes both calendar and queue.
  - New-session Ticket types are distinguished from change/cancellation types that still need explicit original-Session linkage.
- Safety:
  - no `app/admin/**` page or web workflow changed
  - no API, database migration or new business write
  - calendar workbench remains GET-only and formal scheduling still uses the existing signed preview and transaction checks
  - attendance, package balances, finance, payroll, partner settlement and notifications are unchanged
- Files:
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `tests/miniapp-staff-schedule-calendar.test.ts`
  - `docs/tasks/TASK-20260717-miniapp-calendar-ticket-queue.md`
- Verification before deploy:
  - all native-miniapp JavaScript syntax
  - focused calendar tests `5/5`
  - complete miniapp/subscription tests `41/41`
  - backend tests `79/79`
  - 30-page miniapp release audit with zero errors
  - TypeScript and 194-page production build
  - `git diff --check` and no-`app/admin/**` diff check
- Post-deploy verification:
  - local, GitHub and server aligned at feature commit `d919074`
  - 107 migrations current, PM2 online and `/admin/login` HTTP 200
  - deployed miniapp source contains the queue and original-Session boundary markers
  - anonymous calendar and coordination endpoints both return 401
  - read-only production counts report 6 open and 6 overdue scheduling Tickets
  - WeChat Developer Tools upload `1.0.0` succeeds for the production AppID with a 335.2 KB package
  - WeChat portal experience-version designation and physical-phone regression remain external release gates

## Process Guard (Installed)

1. `deploy_app.sh` now calls `verify_release_docs.sh` by default.
2. GitHub Actions deploy workflow now runs the same gate before SSH deploy.
3. `release_to_server.sh` is the only normal local release entry: it checks a clean tracked worktree, GitHub SSH 443 authentication, release docs and fast-forward safety before push.
4. After push, the release command verifies GitHub has the exact local commit, calls the server deploy primitive, then verifies the server commit, PM2 PID and HTTP health.
5. Emergency bypass exists: `SKIP_RELEASE_DOC_CHECK=true` (use only for urgent hotfix).

## Server Handoff Guard (Installed)

1. Added fixed server profile doc: `docs/SERVER-HANDOFF.md`
2. Added local config template: `ops/server/server-handoff.env.example`
3. Added one-command scripts:
   - `bash ops/server/scripts/quick_check.sh`
   - `bash ops/server/scripts/release_to_server.sh --check`
   - `bash ops/server/scripts/release_to_server.sh`
4. `quick_deploy.sh` remains an internal server-deploy primitive and is not the normal release entry.

## Next Mandatory Step (No Business Logic Change)

1. Keep `CHANGELOG-LIVE`, `RELEASE-BOARD`, `TASK-*` updated for each deploy commit.
2. Keep the GitHub SSH identity and `ssh.github.com:443` mapping available on each release machine.
3. Keep ops docs aligned with Neon-as-production-db policy.

## 2026-07-16-r256 Live

- Scope: complete the planned pre-university Full Care V1 before student-by-student operational rollout.
- Business impact: quality exception dashboard; 30-minute/2-hour/24-hour/72-hour risk response SLA; guarded risk status and resolution evidence; backup coverage and handover; parent report questions linked to 24-hour staff tasks; reviewed service-value and continuation records.
- Safety: additive migration only creates four isolated CARE control tables. Existing students, care projects, teaching, schedules, attendance, packages, partner settlement, invoices, receipts and payroll are not automatically updated.
- Validation: 79 backend tests, 194-page production build, 30-page miniapp audit, 107 production migrations, authenticated desktop/mobile browser checks, parent API privacy/permission/closure checks, PM2 online with zero restarts and HTTP 200.
- QA cleanup: temporary training student, parent, engagement, report, question, risk, coverage, review, admin session and parent session all returned to zero residue.
- Protected state after cleanup: 89 students, 78 packages, 1,916 sessions and 34 partner settlements. Attendance is 1,743 because Li Hexuan and Huang Zihao were normally marked present at 12:21 and 12:32 Singapore time; unrelated to this release. CARE state is 2 engagements, 0 plans, 1 activity, 0 tasks/attachments/views/questions/risks/coverage/reviews, and 1 real Louis report draft created at 13:14 Singapore time, which was preserved.
- SOP: `docs/SOP-教务-全托管完整操作流程-培训版-20260716.html`; validated PDF is 22 A4 landscape pages with real production screenshots and red callouts.
- Task doc: `docs/tasks/TASK-20260716-care-complete-v1.md`

## 2026-07-16-r255 Live

- Scope: formal care progress reports for the pre-university-first service model, while retaining consent-aware lightweight university reporting.
- Business impact:
  - care owners can create monthly, milestone, significant-event and term report drafts from real lesson, feedback, care-update, task and evidence sources
  - reports follow draft, review, approval and publication states; published content is locked and can only be revoked with a reason
  - parents with the existing report permission can view published reports, open a PDF and confirm receipt in the miniapp
  - management can see parent view count, last view and acknowledgement status
  - university reports remain hidden unless the adult student authorized the `formal_reports` section
- Safety:
  - additive migration creates four isolated report tables and no protected workflow table is changed
  - report write actions verify the current care project, actor access, reviewer role and optimistic version
  - generated placeholders and reports without evidence cannot be submitted
  - internal notes are never serialized to the parent interface or PDF
- Validation before deploy:
  - Prisma validation/generation and TypeScript pass
  - backend tests pass `73/73`; focused report and migration tests pass `7/7`
  - miniapp JavaScript syntax and 30-page release audit pass
  - production build passes with 193 pages
  - `git diff --check` passes
- PDF rendering: a production-like report renders as two populated A4 pages with correct `1/2` and `2/2` footers; a regression test prevents footer placement from creating blank pages.
- Deployment status: LIVE at runtime commit `d926d5d`; 106 migrations, PM2 online with zero restarts and `/admin/login` HTTP `200`.
- Production acceptance: admin report workspace, parent list/detail/PDF/acknowledgement and anonymous `401` checks passed. Internal notes were absent from parent output. Final PDF is two populated A4 pages with correct page numbers. Temporary student, parent, engagement, activity, report, view, sessions and QA audits were cleaned to zero.
- Protected baseline after cleanup: 89 students, 78 packages, 1,916 sessions, 34 partner settlements and care counts `2/0/1/0/0/0/0` for engagements/plans/activities/tasks/attachments/reports/views. Attendance changed `1,740 -> 1,741` because Zhao Jiabo was normally marked present at 12:01 Singapore time during deployment; it is unrelated to this release.
- Task doc: `docs/tasks/TASK-20260716-care-formal-reports.md`

## 2026-07-16-r254 Live

- Scope: turn GitHub push and server deployment into one fail-closed release workflow.
- Operational impact:
  - normal releases no longer use HTTPS Git push or manually sequence push and server deployment
  - `--check` runs the complete read-only preflight without changing GitHub or production
  - tracked local changes, missing release docs, unavailable SSH 443, failed GitHub identity, or non-fast-forward history stop the release before production action
  - after deployment, local, GitHub and server commits must match before success is reported
- Safety: process and documentation only; no application behavior, database, finance, scheduling, attendance, package, payroll or receipt data changes.
- Verification:
  - shell syntax validation
  - guarded read-only preflight
  - real release using `release_to_server.sh`
  - PM2 PID and `/admin/login` HTTP 200
  - task doc: `docs/tasks/TASK-20260716-guarded-git-server-release.md`

## 2026-07-16-r253 Live

- Scope: include issued and void partner Credit Notes in the Finance Documents center and calculate partner-invoice adjusted amounts from issued credits.
- Business impact:
  - Finance can find `RGT-CN-*` documents by number or original invoice and open PDF or PDF + Seal.
  - Partner invoice rows retain their immutable original amount and separately show issued credit, adjusted amount, approved receipts and remaining balance.
  - Payment status uses the adjusted invoice amount; a fully credited invoice is labelled `Fully credited` instead of unpaid.
  - Finance Documents Excel includes Credit Note rows, related invoice, issued credit, adjusted amount, status and both PDF links.
  - No invoice, receipt, Credit Note, settlement or payment data is written or rewritten.
- Files:
  - `lib/finance-documents.ts`
  - `app/admin/finance/documents/page.tsx`
  - `app/api/exports/finance-documents/route.ts`
  - `tests/finance-documents.test.ts`
  - `docs/tasks/TASK-20260716-finance-documents-credit-notes.md`
- Verification before deploy:
  - focused tests 9/9
  - TypeScript passed
  - production build passed with 193 pages
  - authenticated Finance Playwright and Excel checks passed against the real issued Credit Note
- Post-deploy verification:
  - verify `RGT-202606-0019` shows SGD 18,540 / 270 / 18,270 / 18,270
  - verify `RGT-CN-202607-0001` shows ISSUED and both PDF links
  - verify Credit Note-only filtering shows `0 / 0 / 0` in unpaid/partial/pending
- task doc: `docs/tasks/TASK-20260716-finance-documents-credit-notes.md`

## 2026-07-14-r252 Live

- Scope: remove implicit Ticket creation from employee-miniapp student selection and add a dedicated student scheduling workspace.
- Business impact:
  - selecting a student now only reads packages, courses, teachers, campuses, upcoming Sessions and existing coordination Tickets
  - ADMIN can schedule directly with the same safety checks as the existing mobile/web scheduling path, without manufacturing a Ticket
  - ADMIN/CS only create a coordination Ticket after selecting a course, entering a reason and confirming
  - concurrent duplicate coordination submissions for the same student and course are serialized and reuse the open Ticket
  - five known legacy auto-created Tickets were cancelled with five audit rows and no hard deletion
- Validation:
  - `npx tsc --noEmit --pretty false`
  - `npm run test:backend` (66/66)
  - `npx tsx --test tests/miniapp-first-scheduling.test.ts` (10/10)
  - `npm run miniapp:audit-release` (28 pages)
  - all miniapp JavaScript passed `node --check`
  - `npm run build` (193 pages)
  - real read-only workspace check kept open employee-miniapp scheduling Tickets at `0 -> 0`
  - production runtime `d705793`, PM2 online with zero restarts and `/admin/login` returning `200`
  - post-deploy database check confirmed five cancelled Tickets, five cancellation audit rows and zero open employee-miniapp scheduling Tickets
  - task doc: `docs/tasks/TASK-20260714-miniapp-scheduling-read-only-entry.md`

## 2026-07-14-r250 Live

- Scope: add formal Credit Notes for partner invoices without changing the existing invoice, receipt or settlement stores.
- Business impact:
  - Finance/Superadmin can create a partial line-level draft from an existing partner invoice, then issue or void it with retained history.
  - Each note receives an independent `RGT-CN-YYYYMM-####` tracking number and stores an immutable source-invoice snapshot.
  - Original total, issued credits and adjusted net are shown together; drafts and void notes do not reduce the adjusted net.
  - The PDF identifies the original invoice, reason, credited lines, GST, credit total and adjusted balance; only issued notes show the company seal.
  - Existing receipts are not changed automatically, and an invoice with Credit Note history cannot be deleted.
- Safety:
  - additive migration creates only `CreditNote` and `CreditNoteLine`
  - no existing business table or `AppSetting` invoice JSON is altered
  - line and invoice over-credit are rejected inside serializable transactions
  - current invoice, receipt, package, attendance, payroll and settlement paths keep their existing behavior
- Verification before deploy:
  - `npx prisma validate` and `npx prisma generate`
  - `npx tsc --noEmit`
  - `npm run test:backend` (66/66)
  - `npm run build` (193 pages)
  - `git diff --check`
  - New Oriental SGD 270 partial-credit and repeated-credit limits covered by tests
- Deployment status: local READY only; no production migration, commit, push or server deployment has been performed.

## 2026-07-14-r249 Live

- Scope: first implementation phase of the differentiated university-care plan.
- Business impact:
  - new projects can be university academic management, postgraduate preparation or internship/employment support
  - programme selection changes the available and default service scope instead of reusing university-preparation life-care defaults
  - owner roles and follow-up categories follow the selected university track
  - university projects store institution, degree, year/term, expected graduation, current/target GPA labels and adult-student consent
  - parent-report eligibility for university records requires recorded consent and at least one authorized section
  - existing university scope selections are preserved and marked for review; pre-university defaults and all teaching/finance workflows remain unchanged
- Verification before deploy:
  - `npx prisma validate`
  - `npx tsc --noEmit`
  - `npm run test:backend` (60/60)
  - `npm run build` (193 pages)
- Post-deploy verification:
  - 104 migrations completed; the university-profile table and postgraduate enum value exist
  - PM2 online with zero restarts; `/admin/login` => `200`
  - authenticated create-form switching passed across all five programme types
  - the existing NUS draft displays its earlier scopes as retained and its stored scope JSON is unchanged
  - temporary university profile save, limited-consent selection, pre-consent blocking and post-consent parent eligibility passed
  - desktop and 390px mobile layouts passed without horizontal overflow
  - the temporary student, project, profile, activity, session and three audit rows were cleaned to zero
  - protected baseline returned to 89 students, 78 packages, 1,899 sessions, 1,711 attendance rows, 34 partner settlements and 2/0/1/0/0 care engagements/plans/activities/tasks/attachments

## 2026-07-14-r248 Live

- Scope: add private evidence files and structured communication sources to each full-care project.
- Business impact:
  - CARE staff can upload school emails, notices, meeting minutes, academic reports and life-coordination evidence, then associate each file with an existing follow-up or task.
  - Active evidence can be viewed or downloaded only after project access is checked; archive and restore preserve the file and audit history.
  - Existing lesson, attendance, package, settlement, payroll, invoice, receipt and finance workflows are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `lib/care-evidence-files.ts`
  - `lib/care-management.ts`
  - `app/admin/care/[id]/page.tsx`
  - `app/api/admin/care/**`
  - `tests/care-evidence.test.ts`
- Verification before deploy:
  - `npx prisma validate`
  - `npx tsc --noEmit`
  - `npm run test:backend` (53/53)
  - `npm run build` (193 pages)
  - production-mode browser upload/download/archive/restore and unauthorized-access checks
- Post-deploy verification:
  - 103 migrations current, PM2 online with zero restarts and `/admin/login` => `200`
  - authenticated upload, project-page listing and private download on a temporary production care project
  - unauthenticated file access => `401`; authorized file access => private signed `302` and original content
  - temporary database records, session, audit rows and S3 object cleaned to zero
  - protected baseline unchanged at 88 students, 78 packages, 1,895 sessions, 1,711 attendance rows, 34 partner settlements and 1/0/1/0/0 care engagements/plans/activities/tasks/attachments

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
  - `tests/student-schedule-export.test.ts`
  - `package.json`
  - `docs/tasks/TASK-20260710-student-schedule-export-teacher-override.md`
- Verification before deploy:
  - read-only DB check for the reported 2026-07-12 lesson
  - `npm run test:backend`
  - `npx tsc --noEmit`
- Post-deploy verification:
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login`
  - verify production commit hash matches the deployed r213 commit.

## 2026-07-10-r211 Ready

- Scope: add mobile attendance marking to the staff miniapp course detail page.
- Business impact:
  - Teachers can open a course from the staff miniapp schedule and mark each visible student as unmarked, present, absent, late, or excused.
  - Teachers can add attendance notes from mobile.
  - The server requires a linked teacher profile and permits writes only for sessions assigned to that teacher.
  - Existing package deduction, billing, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw flows are intentionally unchanged.
- Files:
  - `app/api/miniapp/staff/schedule/[sessionId]/attendance/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-attendance.md`
- Verification before deploy:
  - miniapp JS syntax and JSON parse checks
  - staff WXML complex-expression scan
  - `npx tsc --noEmit`
  - `npm run build`
- Post-deploy verification:
  - `curl -sS --max-time 20 https://sgtmanage.com/api/miniapp/staff/schedule/test/attendance`
  - verify the attendance route returns `Unauthorized` instead of `404`.

## 2026-07-10-r210 Ready

- Scope: fix native miniapp staff page blank rendering by simplifying WXML bindings and making staff-home API loading non-blocking.
- Business impact:
  - Employee workbench, daily schedule, request queue, request detail, and course feedback pages avoid complex WXML expressions that can fail in WeChat Developer Tool rendering.
  - Display fallback values are now computed in page JavaScript before binding.
  - Employee workbench renders its main action cards before optional request-count and course-count APIs finish; timeout leaves the count at 0 instead of blanking the page.
  - Unused `scope.writePhotosAlbum` permission was removed from `app.json`.
  - Backend routes, staff login, parent request updates, schedule reads, feedback writes, scheduling, attendance deduction, package ledger, billing, payroll, and OpenClaw flows are unchanged.
- Files:
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `miniapp/boss-academic-parent/utils/api.js`
  - `miniapp/boss-academic-parent/app.json`
  - `docs/tasks/TASK-20260710-miniapp-staff-wxml-render-fix.md`
- Verification before deploy:
  - staff WXML complex-expression scan
  - miniapp JS syntax and JSON parse checks
  - staff home non-blocking timeout behavior checked by code inspection
- Post-deploy verification:
  - Recompile the miniapp in WeChat Developer Tool and open `pages/staff-home/staff-home`.

## 2026-07-10-r209 Ready

- Scope: add staff miniapp course detail feedback submission for teachers.
- Business impact:
  - Teachers can tap a course from the staff miniapp schedule and submit or update parent-facing after-class feedback from mobile.
  - The miniapp form keeps the existing five required parent-readable sections plus homework and previous-homework completion state.
  - The server requires a linked teacher profile and only permits writing feedback for sessions assigned to that teacher.
  - Existing scheduling writes, attendance deduction, package ledger, billing, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw flows are intentionally unchanged.
- Files:
  - `app/api/miniapp/staff/schedule/[sessionId]/feedback/route.ts`
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-feedback.md`
- Verification before deploy:
  - miniapp JS syntax and JSON parse checks
  - `npx tsc --noEmit`
  - staff feedback route included in Next production build
  - `npm run build`
- Post-deploy verification:
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`
  - `curl -sS --max-time 20 https://sgtmanage.com/api/miniapp/staff/schedule/test/feedback`
  - verify the feedback route returns `Unauthorized` instead of `404`.

## 2026-07-10-r208 Ready

- Scope: add staff miniapp daily schedule access and request type filtering for mobile coordination.
- Business impact:
  - 教务和管理 can open the staff miniapp workbench and see today's course count plus a daily lesson list for coordination while away from desktop.
  - Teachers can open the staff miniapp schedule page, but their account is forced to their linked teacher schedule even if the client asks for all lessons.
  - Staff can filter parent requests by type, including schedule requests, leave/cancel, finance, complaints, feedback, school matters, and teacher messages.
  - Existing scheduling writes, attendance deduction, package ledger, receipts, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw flows are intentionally unchanged.
- Files:
  - `lib/miniapp-staff-schedule.ts`
  - `app/api/miniapp/staff/schedule/route.ts`
  - `app/api/miniapp/staff/parent-requests/route.ts`
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `docs/tasks/TASK-20260710-miniapp-staff-schedule.md`
- Verification before deploy:
  - miniapp JS syntax and JSON parse checks
  - `npx tsc --noEmit`
  - local staff schedule API smoke checks for unauthorized access, admin/all schedule access, and teacher-only schedule scoping
  - `npm run build`
- Post-deploy verification:
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`
  - `curl -sS --max-time 20 https://sgtmanage.com/api/miniapp/staff/schedule`
  - verify `/api/miniapp/staff/schedule` returns `Unauthorized` instead of `404`.

## 2026-07-10-r207 Ready

- Scope: ship native miniapp parent access APIs, staff miniapp request handling, notification queue foundation, admin miniapp opening tools, and set the miniapp default API base to `https://sgtmanage.com`.
- Business impact:
  - Parents can bind students, view schedule/feedback/finance, submit requests, upload attachments, and download finance PDFs once the miniapp is formally configured.
  - Staff can bind WeChat, open the miniapp staff workbench, view parent requests, and update request status from mobile.
  - Existing scheduling, attendance deduction, package ledger, receipts, payroll, partner settlement, transport billing, Business Accounts, and OpenClaw flows are intentionally unchanged.
- Files:
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
- Verification before deploy:
  - `npx prisma generate`
  - `npx prisma validate`
  - `npx prisma migrate status`
  - `npx tsc --noEmit`
  - miniapp JS syntax and JSON parse checks
  - mock staff miniapp binding/login/request-list/status-update smoke checks against local dev server
  - `npm run build`
- Post-deploy verification:
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`
  - `curl -sS --max-time 20 https://sgtmanage.com/api/miniapp/staff/me`
  - verify `/api/miniapp/staff/me` returns `Unauthorized` instead of `404`.

## 2026-07-08-r205 Ready

- Scope: add multi-partner settlement configuration, including a Partner setup page, New Oriental legacy backfill, Shanghai Xin Zhuo Si config, and partner-scoped settlement/billing/receipt flows.
- Business impact:
  - Admins can open `/admin/partners` to create or update partners, student-source binding, invoice Bill To, online/offline rates, default package minutes, and enabled settlement modes.
  - Partner settlement and billing pages now include a partner selector so New Oriental and Shanghai Xin Zhuo Si settlement items, invoices, payment proofs, and receipts stay separated.
  - Existing New Oriental settlement records are preserved and bound to the New Oriental Partner config; old partner-billing JSON without `partnerId` remains visible only in the New Oriental view.
  - Parent billing, direct-billing contracts, attendance deduction, scheduling, teacher payroll, transport billing, Business Accounts, and OpenClaw behavior are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260708120000_add_multi_partner_config/migration.sql`
  - `lib/partners.ts`
  - `lib/partner-billing.ts`
  - `app/admin/partners/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/_components/PurchaseBatchEditor.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/api/exports/partner-invoice-detail/[id]/route.ts`
  - `lib/tickets.ts`
  - `docs/tasks/TASK-20260708-multi-partner-settlement-config.md`
- Verification before deploy:
  - `npx prisma generate`
  - `npx tsc --noEmit`
  - `npm run test:backend`
  - `npx prisma migrate deploy`
  - read-only Prisma check confirmed `新东方` and `上海新卓思` Partner configs exist and 32 legacy New Oriental settlements are bound to `legacy-xdf-partner`.
  - local smoke checks compiled `/admin/reports/partner-settlement`, `/admin/reports/partner-settlement/billing`, and `/admin/partners`.
  - `npm run build`
- Post-deploy verification:
  - `ssh -i "/Users/zhao111/Documents/sgt系统/.ssh/tuition_scheduler888.pem" -o StrictHostKeyChecking=no ubuntu@43.128.46.115 'cd /home/ubuntu/apps/tuition-scheduler && git rev-parse HEAD && pm2 status tuition-scheduler --no-color'`
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/partners | sed -n '1,12p'`

## 2026-06-17-r189 Ready

- Scope: add a read-only finance/admin report and Excel export for one student's package utilization, calculated from deducted attendance rows and optionally filtered by package ID.
- Business impact:
  - Finance can open `/admin/finance/student-package-utilization` or the Finance Workbench shortcut to calculate one student's attended/deducted hours.
  - Shared packages can be split by student, so Coco Xu and Eason Xu usage can be separated even when they share the same package.
  - The report also lists available/shared packages to help finance copy the correct package ID before exporting.
  - Attendance marking, package balances, package ledger transactions, invoices, receipts, scheduling, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw are unchanged.
- Files:
  - `lib/student-package-utilization-report.ts`
  - `app/admin/finance/student-package-utilization/page.tsx`
  - `app/api/exports/student-package-utilization/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/tasks/TASK-20260617-student-package-utilization.md`
- Verification before deploy:
  - `npm run build`
  - `npx tsc --noEmit`
  - Local auth smoke check confirmed `/admin/finance/student-package-utilization` compiles and redirects unauthenticated users to `/admin/login`.
  - Read-only data check for `Coco Xu` through `2026-06-17` returned 45 deducted attendance rows and 59.5 deducted hours on shared package `1df7bb95-8de1-4c10-bd7a-6a935af6af0e`.
- Post-deploy verification:
  - `ssh -i "/Users/zhao111/Documents/sgt系统/.ssh/tuition_scheduler888.pem" -o StrictHostKeyChecking=no ubuntu@43.128.46.115 'cd /home/ubuntu/apps/tuition-scheduler && git rev-parse HEAD && pm2 status tuition-scheduler --no-color'`
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`

## 2026-05-30-r162 Ready

- Scope: allow Teacher Notices to attach one active Shared Docs file for direct tutor access from the portal and dashboard notice card.
- Business impact:
  - Admin/finance users can upload the bilingual tutor guide through Shared Docs, then select that document while creating or editing a Teacher Notice.
  - Teachers can open or download only the attached document from the active notice.
  - Teachers do not receive access to the full Shared Docs library.
  - Payroll, payment amount calculation, expense claims, attendance, scheduling, packages, contracts, invoices, receipts, and OpenClaw are unchanged.
- Files:
  - `lib/teacher-notices.ts`
  - `app/admin/teacher-notices/page.tsx`
  - `app/teacher/notices/page.tsx`
  - `app/teacher/TeacherNoticeCardClient.tsx`
  - `app/api/shared-docs/[id]/file/route.ts`
  - `tests/teacher-notices.test.ts`
  - `docs/tasks/TASK-20260530-teacher-notice-shared-doc-attachments.md`
- Verification before deploy:
  - `npx tsx --test tests/teacher-notices.test.ts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Post-deploy verification:
  - `ssh -i "/Users/zhao111/Documents/sgt系统/.ssh/tuition_scheduler888.pem" -o StrictHostKeyChecking=no ubuntu@43.128.46.115 'cd /home/ubuntu/apps/tuition-scheduler && git rev-parse HEAD && pm2 status tuition-scheduler --no-color'`
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`

## 2026-05-29-r161 Ready

- Scope: limit tutor payment-profile collection to PayNow or Wise and add finance review status for payout details.
- Business impact:
  - Teachers can submit PayNow for local payout or Wise details for overseas payout.
  - New Bank Transfer submission is no longer offered; old bank-transfer data remains visible as legacy read-only reference.
  - Admin/finance users can mark payment profiles as pending review, verified, or rejected with a reason.
  - Payroll, expense-claim, and tutor-cost cutoff exports include Wise details and payment-profile review status.
  - Payroll amount calculation, expense approval, attendance, scheduling, package balances, invoices, and receipts are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260529090000_add_teacher_wise_payment_profile/migration.sql`
  - `lib/teacher-payment-profile.ts`
  - `app/teacher/payment-details/page.tsx`
  - `app/admin/_components/TeacherCreateForm.tsx`
  - `app/admin/teachers/page.tsx`
  - `app/admin/teachers/[id]/page.tsx`
  - `app/api/admin/teachers/route.ts`
  - `app/api/admin/teachers/[id]/route.ts`
  - `app/admin/reports/teacher-payroll/export/route.ts`
  - `app/api/exports/expense-claims/route.ts`
  - `app/api/exports/tutor-cost-cutoff/route.ts`
  - `tests/teacher-payment-profile.test.ts`
  - `docs/tasks/TASK-20260529-tutor-wise-payment-profile.md`
- Verification before deploy:
  - `npx prisma generate`
  - `npx tsc --noEmit --pretty false`
  - `npx tsx --test tests/teacher-payment-profile.test.ts`
  - `npm run test:backend`
  - `npm run build`
- Post-deploy verification:
  - `ssh -i "/Users/zhao111/Documents/sgt系统/.ssh/tuition_scheduler888.pem" -o StrictHostKeyChecking=no ubuntu@43.128.46.115 'cd /home/ubuntu/apps/tuition-scheduler && git rev-parse HEAD && pm2 status tuition-scheduler --no-color'`
  - `curl -I -sS --max-time 20 https://sgtmanage.com/admin/login | sed -n '1,12p'`

## 2026-05-28-r157 Ready

- Scope: fix the Resource Follow-up new resource form layout so owner and intent controls stay within their responsive grid columns.
- Business impact:
  - `/admin/leads/new` no longer lets the owner selector visually collide with the intent selector.
  - Resource creation, owner assignment, follow-up records, teacher assessment, student conversion, booking links, billing, contracts, packages, attendance, payroll, and OpenClaw are unchanged.
- Files:
  - `app/admin/leads/new/page.tsx`
  - `docs/tasks/TASK-20260528-lead-new-form-layout-fix.md`
- Verification:
  - `npm run build`

## 2026-05-28-r156 Ready

- Scope: finish the next Resource Follow-up CRM gaps with faster list filters, CSV focus alignment, assessment cancellation, and Booking Link handoff.
- Business impact:
  - Admin users can jump directly to My Resources, Today, This Week, Hot, Overdue, Pending Assessment, Won, and Lost from `/admin/leads`.
  - CSV export uses the same focus filter as the resource list.
  - Admin users can cancel pending or revision-requested teacher assessments without deleting their records.
  - Converted resources show a Booking Link handoff that opens the existing Booking Links page with student, title, and note prefilled.
  - Booking Link creation API, teacher matching, scheduling availability, billing, contracts, packages, receipts, payroll, attendance, and OpenClaw are unchanged.
- Files:
  - `lib/leads.ts`
  - `app/admin/leads/page.tsx`
  - `app/admin/leads/[id]/page.tsx`
  - `app/admin/leads/export/route.ts`
  - `app/admin/booking-links/page.tsx`
  - `app/admin/booking-links/_components/BookingLinkCreateForm.tsx`
  - `tests/leads.test.ts`
  - `docs/tasks/TASK-20260528-resource-followup-shortcuts-and-booking.md`
- Verification:
  - `npx prisma validate`
  - `npx tsx --test tests/leads.test.ts`
  - `npm run build`

## 2026-05-28-r155 Ready

- Scope: improve the Resource Follow-up CRM after first production testing with owner maintenance, editability, archive cleanup, My Resources filtering, and safer test-data cleanup.
- Business impact:
  - Admin users can maintain `/admin/leads/owners` without changing login roles.
  - New resource creation and resource filters use active owner names from the independent owner list.
  - Resource detail pages allow admin users to correct owner, source, parent/student details, intent, status, needs, and lost reason.
  - Old resources can be archived and restored; archived resources are hidden from the default list but can be filtered and exported.
  - `My resources` filters by the current logged-in admin name and CSV export follows the same filter.
  - Owner manager can physically delete clearly marked `TEST` resources only; real resources remain archive-only.
  - Billing, contracts, packages, receipts, attendance, payroll, teacher costs, scheduling conflict logic, and OpenClaw are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260528093000_resource_owner_and_archive/migration.sql`
  - `lib/leads.ts`
  - `app/admin/leads/page.tsx`
  - `app/admin/leads/new/page.tsx`
  - `app/admin/leads/[id]/page.tsx`
  - `app/admin/leads/owners/page.tsx`
  - `app/admin/leads/export/route.ts`
  - `tests/leads.test.ts`
  - `docs/tasks/TASK-20260528-resource-owner-archive-enhancements.md`
- Verification:
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx tsx --test tests/leads.test.ts`
  - `npm run build`

## 2026-05-28-r154 Ready

- Scope: add the first Resource Follow-up CRM workflow from customer inquiry through sales follow-up, teacher assessment, student conversion, scheduling ticket handoff, dashboard metrics, and CSV export.
- Business impact:
  - Admin users can create resources from sources such as Xiaohongshu, Douyin, short video/self-media, referrals, channels, WeChat/private domain, website/forms, offline events, and manual platforms.
  - Sales/customer-service owners use existing admin user names rather than a new role.
  - Resource detail pages keep follow-up history, next action, due date, intent level, and status.
  - Teachers get a dedicated `Assessment Requests / 评估请求` page and can submit assigned assessments; submitted assessments are locked until admin approves revision.
  - Admin can convert a resource into a Student with source channel automatically set and source detail written into the student note.
  - Admin can create a scheduling coordination ticket after conversion.
  - Admin can view a 7-day resource dashboard and export filtered resources as CSV.
  - Billing, contracts, packages, receipts, attendance, payroll, teacher costs, and OpenClaw are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260528090000_add_resource_followup_crm/migration.sql`
  - `lib/leads.ts`
  - `app/admin/leads/page.tsx`
  - `app/admin/leads/new/page.tsx`
  - `app/admin/leads/[id]/page.tsx`
  - `app/admin/leads/dashboard/page.tsx`
  - `app/admin/leads/export/route.ts`
  - `app/teacher/assessments/page.tsx`
  - `app/admin/layout.tsx`
  - `app/teacher/layout.tsx`
  - `tests/leads.test.ts`
  - `docs/tasks/TASK-20260528-resource-followup-crm-plan.md`
- Verification before deploy:
  - `npx prisma generate`
  - `npx tsx --test tests/leads.test.ts`
  - `npm run build`
- Post-deploy verification:
  - confirm `/admin/login` returns `200` and pm2 reports `tuition-scheduler` online
  - confirm migration adds Lead CRM tables
  - confirm `/admin/leads` and `/teacher/assessments` redirect unauthenticated users to login
  - confirm `/admin/leads/export` is protected by admin auth

## 2026-05-27-r153 Ready

- Scope: add a reflection history dashboard to Manager Quality so managers can review previous feedback and checklist completion rates.
- Business impact:
  - Managers can choose 7, 14, 30, or 90-day history windows.
  - The page shows submitted days, fully completed days, all-item checklist completion rate, incomplete day count, per-checklist-item completion, and previous feedback text.
  - Managers can filter the history table to only incomplete reflection days.
  - Existing reflection submission, Lead Desk snapshots, feedback snapshots, approvals, scheduling, billing, payroll, and OpenClaw behavior are unchanged.
- Files:
  - `app/admin/manager/quality/page.tsx`
  - `lib/manager-quality-workspace.ts`
  - `lib/manager-reflection-summary.ts`
  - `tests/manager-quality-workspace.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/manager-quality-workspace.test.ts`
  - `npm run build`
- Post-deploy verification:
  - confirm `/admin/login` returns `200` and pm2 reports `tuition-scheduler` online
  - confirm `/admin/manager/quality` is still protected by manager/admin auth
  - confirm empty or low-history managers see the dashboard without errors

## 2026-05-27-r152 Ready

- Scope: support tutors who receive reimbursements or payroll by bank transfer instead of PayNow.
- Business impact:
  - Teacher/admin payment profiles now have `Payment Method`, PayNow fields, and bank-transfer fields.
  - Teacher self-service payment details page can capture bank name, account holder name, account number, and SWIFT/branch code.
  - Teacher payroll CSV, tutor cost cut-off XLSX, and expense-claim CSV exports include bank-transfer columns.
  - Salary, tutor cost, expense claim status, approval, scheduling, attendance, and OpenClaw behavior are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260527093000_add_teacher_bank_payment_profile/migration.sql`
  - `lib/teacher-payment-profile.ts`
  - `app/admin/_components/TeacherCreateForm.tsx`
  - `app/admin/teachers/page.tsx`
  - `app/admin/teachers/[id]/page.tsx`
  - `app/teacher/payment-details/page.tsx`
  - `app/admin/reports/teacher-payroll/export/route.ts`
  - `app/api/exports/tutor-cost-cutoff/route.ts`
  - `app/api/exports/expense-claims/route.ts`
  - `tests/teacher-payment-profile.test.ts`
- Verification before deploy:
  - `npx prisma generate`
  - `npx tsx --test tests/teacher-payment-profile.test.ts tests/tutor-cost-cutoff.test.ts tests/expense-claims.test.ts`
  - `npm run build`
- Post-deploy verification:
  - confirm `/admin/login` returns `200` and pm2 reports `tuition-scheduler` online
  - confirm production `Teacher` table has bank-transfer columns
  - confirm teacher payment details route still redirects unauthenticated users as expected

## 2026-05-27-r151 Ready

- Scope: add permanent tutor serial numbers and PayNow payment profiles for tutor payroll and expense-claim reimbursement workflows.
- Business impact:
  - Existing teachers receive deterministic `T###` codes during migration; new teachers get the next code automatically unless admin enters one.
  - Teachers can update their own PayNow details from the teacher portal.
  - Finance exports for salary slips, tutor cost cut-off, and expense claims include tutor code plus PayNow type/value/name.
  - Existing payroll amounts, tutor-cost amounts, expense statuses, approvals, scheduling, attendance, and OpenClaw behavior are unchanged.
- Files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260527090000_add_teacher_payment_profile/migration.sql`
  - `lib/teacher-payment-profile.ts`
  - `app/admin/_components/TeacherCreateForm.tsx`
  - `app/admin/teachers/page.tsx`
  - `app/admin/teachers/[id]/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/payment-details/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/export/route.ts`
  - `app/api/exports/tutor-cost-cutoff/route.ts`
  - `app/api/exports/expense-claims/route.ts`
  - `tests/teacher-payment-profile.test.ts`
- Verification before deploy:
  - `npx prisma generate`
  - `npx tsx --test tests/teacher-payment-profile.test.ts`
  - `npx tsx --test tests/tutor-cost-cutoff.test.ts tests/expense-claims.test.ts tests/teacher-payment-profile.test.ts`
  - `npm run build`
- Post-deploy verification:
  - confirm `/admin/login` returns `200` and pm2 reports `tuition-scheduler` online
  - confirm teacher payroll export and expense-claim export headers include tutor code and PayNow columns
  - confirm `/teacher/payment-details` renders for a linked teacher account

## 2026-05-19-r150 Ready

- Scope: allow New Oriental online package-end settlement to handle manually expired packages where a parent forfeits the remaining balance.
- Business impact:
  - Staff can close a New Oriental online package, write off the unused balance, and settle the full purchased package minutes.
  - Active incomplete online partner packages still do not appear as settlement candidates.
  - No attendance deduction, scheduling, direct-billing, receipt, payroll, or OpenClaw behavior changes.
- Files:
  - `lib/partner-settlement.ts`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `tests/partner-settlement.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/partner-settlement.test.ts`
  - `npm run build`
- Post-deploy verification:
  - apply the 苏闻熹 one-package closeout data fix only after confirming the same package still has 90 remaining minutes and no settlements
  - confirm 苏闻熹 has one pending online partner settlement for 15 hours / SGD 1400, with 90 minutes noted as forfeited
  - confirm `/admin/login` returns `200` and pm2 reports `tuition-scheduler` online

## 2026-05-17-r149 Ready

- Scope: let the package contract workspace show `Create renewal contract / 创建续费合同` when a historical student has complete parent information only on a voided intake contract.
- Business impact:
  - Historical students who were first sent the parent-info link can switch to renewal contract flow after the mistaken first-purchase draft is voided.
  - Students with no complete parent profile still need the parent-info link first.
  - No invoice, receipt, package balance, attendance, scheduling, or payment proof behavior changes.
- Files:
  - `lib/student-contract.ts`
  - `tests/student-contract-renewal-invoice.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/student-contract-renewal-invoice.test.ts`
  - `npm run build`
- Post-deploy verification:
  - open 汪宇轩's package contract workspace
  - confirm the renewal action appears after the voided first-purchase intake contract
  - create the renewal contract and verify the latest contract has `flowType = RENEWAL`

## 2026-05-16-r148 Ready

- Scope: fix renewal contract signing for legacy direct-billing packages that already have multiple historical invoices.
- Business impact:
  - Old students can sign a renewal contract on a legacy package even when that package has prior invoices and receipts.
  - The renewal signing flow can create the new renewal invoice for this contract instead of being blocked by old invoices.
  - First-purchase contracts still refuse to guess among multiple old invoices, preserving the original safety guard.
- Files:
  - `lib/student-contract.ts`
  - `tests/student-contract-renewal-invoice.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/student-contract-renewal-invoice.test.ts`
  - `npm run build`
- Post-deploy verification:
  - void the mistakenly created first-purchase contract for 汪宇轩
  - create a renewal contract from the package contract workspace
  - generate the sign link and confirm the parent can submit without returning to the unsigned state

## 2026-05-15-r147 Ready

- Scope: add manager/admin sidebar entries for `Finance Workbench`, `Transport Billing`, and `Invoices & Receipts`.
- Business impact:
  - Manager/admin users can find the transport reimbursement billing workflow from the left sidebar.
  - The same sidebar area also exposes the document center needed after invoice generation.
  - No billing, receipt, payment proof, package balance, attendance, scheduling, payroll, or OpenClaw logic changed.
- Files:
  - `app/admin/layout.tsx`
- Verification before deploy:
  - `npm run build`
- Post-deploy verification:
  - log in as manager/admin
  - confirm `Finance & Review / 财务与审核` shows `Transport Billing / 交通费月结`
  - open `/admin/finance/transport-billing`

## 2026-05-15-r146 Ready

- Scope: add finance transport reimbursement billing for parent invoices generated from held lessons.
- Business impact:
  - Finance sidebar and Finance Workbench now include `Transport Billing / 交通费月结`.
  - Finance can filter held lessons by month and student.
  - Finance can mark selected home lessons as parent-billable transport reimbursement rows with an amount and note.
  - Finance can create a parent invoice for marked, uninvoiced rows for one selected student/month.
  - Invoiced rows link back to the generated parent invoice PDF.
  - The workflow is separate from teacher expense claims and does not change attendance, package balances, payroll, partner settlement, receipts, scheduling, or OpenClaw.
- Files:
  - `lib/transport-billing.ts`
  - `app/admin/finance/transport-billing/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/page.tsx`
- Verification before deploy:
  - real-data read check for `2026-03`: 45 students and 394 held lesson rows available for review
  - `npm run build`
- Post-deploy verification:
  - open `/admin/finance/transport-billing`
  - choose a month and student
  - mark one test/real agreed row only when Finance is ready
  - confirm generated invoice appears in Full invoices & receipts

## 2026-05-15-r145 Ready

- Scope: classify academically confirmed historical orphan rollback reversals as resolved exceptions instead of active ledger-integrity alerts.
- Business impact:
  - The red admin `Ledger Integrity Alert / 课包对账告警` no longer repeats the three already confirmed historical exception rows.
  - Package transactions, current balances, attendance rows, invoices, receipts, payroll, scheduling, and OpenClaw are unchanged.
  - New unconfirmed ledger/session mismatches still appear in the alert.
  - Attendance deductions without package binding still appear in the alert.
- Files:
  - `scripts/reconciliation/daily-ledger-integrity.ts`
- Verification before deploy:
  - `npx tsx scripts/reconciliation/daily-ledger-integrity.ts`
  - `npm run build`
- Post-deploy verification:
  - rerun `npx tsx scripts/reconciliation/daily-ledger-integrity.ts` on the server
  - confirm `/admin/packages` no longer shows the stale red alert when no active issues remain
  - confirm `/admin/login` returns 200

## 2026-05-13-r144 Ready

- Scope: make Manager Quality Desk printing output only the useful Lead Desk schedule on one page.
- Business impact:
  - Print preview no longer includes admin sidebar, ledger alerts, Todo Center links, reflection log, or quality snapshot.
  - Print mode uses a compact A4 landscape Lead Desk table.
  - Screen view is unchanged.
  - No data writes or schedule calculations changed.
- Files:
  - `app/admin/manager/quality/page.tsx`
- Verification before deploy:
  - `npx tsc --noEmit`
  - `npm run build`
  - Playwright PDF export for `/admin/manager/quality?date=2026-05-13` produced 1 page
  - PDF text check confirmed only Lead Desk schedule content was present

## 2026-05-13-r143 Ready

- Scope: add a manager quality workspace for printable Lead Desk schedules and daily manager reflection logging.
- Business impact:
  - Manager users such as `jasmine@123.com` see `Manager Quality Desk / 管理者质量工作台` in the left sidebar.
  - The page shows a date-filtered Lead Desk daily schedule grouped by teacher for printing.
  - The page adds a daily workflow checklist covering receipts/invoices/claims, teacher feedback quality, mid-term reports, and end-term reports.
  - The page stores manager reflection notes for operations wins, problems, improvements, and follow-up actions.
  - The page surfaces read-only quality snapshots from approval inbox, teacher feedback, mid-term reports, and final reports.
  - Reminder automation, email reminders, and OpenClaw reminders remain out of scope for this release.
- Files:
  - `lib/manager-quality-workspace.ts`
  - `app/admin/manager/quality/page.tsx`
  - `app/admin/manager/quality/_components/ManagerQualityPrintButton.tsx`
  - `app/admin/layout.tsx`
- Verification before deploy:
  - `npx tsc --noEmit`
  - `npm run build`
  - local authenticated HTTP check for `/admin/manager/quality?date=2026-05-13` returned `200`
  - Playwright verified the left sidebar entry and page content under a Jasmine test session
  - Playwright submitted the reflection form and confirmed the saved AppSetting entry, then the local QA entry/session were removed
- Post-deploy verification:
  - open `/admin/manager/quality` as Jasmine or another manager user
  - confirm the left sidebar shows `Manager Quality Desk / 管理者质量工作台`
  - confirm the Lead Desk print button opens the browser print flow
  - save one real daily reflection entry when Jasmine is ready to start using the log

## 2026-05-13-r142 Ready

- Scope: add package balance audit guardrails and ledger/current-balance synchronization for manual ledger corrections.
- Business impact:
  - Admin and finance sidebars now include `Package Balance Audit / 课包余额复核`.
  - The audit page shows packages where current remaining balance differs from the ledger closing balance.
  - The audit page flags recent rollback or adjustment records that lack a linked session, have missing linked sessions, mention historical orphan/manual reconciliation, or lack structured abnormal-operation notes.
  - Package ledger pages show a red warning when current remaining balance and ledger closing balance differ.
  - Manual package transaction edit/delete/restore/create operations now re-sync current remaining balance from the ledger total after the change.
  - OpenClaw, scheduling, attendance save rules, invoices, receipts, payroll, and partner settlement logic are unchanged.
- Files:
  - `lib/package-balance-audit.ts`
  - `app/admin/reports/package-balance-audit/page.tsx`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/admin/layout.tsx`
- Verification before deploy:
  - `npm run build`
- Post-deploy verification:
  - open `/admin/reports/package-balance-audit`
  - confirm the page renders after login
  - open one package ledger and confirm no red mismatch warning appears when current balance equals ledger closing balance
  - confirm `/admin/login` returns 200

## 2026-05-12-r141 Ready

- Scope: add weekly/monthly individual student utility Excel reporting for admin and finance.
- Business impact:
  - Admin sidebar now includes `Individual Student Utility / 个人学生课时使用` under `Finance & Review`.
  - Finance sidebar now includes `Individual Student Utility / 个人学生课时使用`.
  - FINANCE users are allowed to open `/admin/finance/individual-student-utility` directly.
  - The export includes `Student Summary` and `Utility Detail` sheets.
  - The report is based on lesson/session date, individual student type, confirmed attendance, and deducted minutes.
  - It is read-only and does not change reminders, package balances, attendance, scheduling, billing, approvals, payroll, or OpenClaw.
- Files:
  - `lib/individual-student-utility-report.ts`
  - `app/admin/finance/individual-student-utility/page.tsx`
  - `app/api/exports/individual-student-utility/route.ts`
  - `app/admin/layout.tsx`
- Verification before deploy:
  - real-data helper check for `2026-04`: 20 students, 227 lessons, 399.25 deducted hours
  - `npx tsc --noEmit`
  - `npm run build`
  - local authenticated HTTP page check returned `200`
  - local authenticated Excel export returned `200` and opened with the expected two sheets
- Post-deploy verification:
  - open `/admin/finance/individual-student-utility`
  - download one Excel workbook for `2026-04`
  - confirm `/admin/login` returns 200
  - confirm unauthenticated `/admin/finance/individual-student-utility` redirects to login

## 2026-05-09-r140 Ready

- Scope: expose the tutor cost export in left navigation for admin and finance users.
- Business impact:
  - Admin sidebar now includes `Tutor Cost Export / 老师成本导出` under `Finance & Review`.
  - Finance sidebar now includes `Tutor Cost Export / 老师成本导出`.
  - FINANCE users are allowed to open `/admin/finance/tutor-cost-export` directly.
  - Existing export calculation and Excel format are unchanged.
- Files:
  - `app/admin/layout.tsx`
- Verification before deploy:
  - `npx tsc --noEmit`
  - `npm run build`
- Post-deploy verification:
  - log in as admin or finance and confirm the left sidebar shows `Tutor Cost Export / 老师成本导出`
  - open `/admin/finance/tutor-cost-export`
  - confirm `/admin/login` returns 200

## 2026-05-09-r139 Ready

- Scope: add finance self-service tutor cost export for the 15th-to-month-end cut-off.
- Business impact:
  - Finance can open `/admin/finance/tutor-cost-export`.
  - Selecting a month exports completed and confirmed tutor cost from the 15th through month-end.
  - The Excel workbook includes `Summary` by teacher and `Details` by session.
  - The export uses existing teacher hourly rates and existing payroll completion rules.
  - It is read-only and does not mark payroll as sent, confirmed, approved, or paid.
- Files:
  - `lib/teacher-payroll.ts`
  - `app/admin/finance/tutor-cost-export/page.tsx`
  - `app/api/exports/tutor-cost-cutoff/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `tests/tutor-cost-cutoff.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/tutor-cost-cutoff.test.ts`
  - `npx tsc --noEmit`
  - local compile check for `/admin/finance/tutor-cost-export`
- Post-deploy verification:
  - open `/admin/finance/tutor-cost-export`
  - download one Excel workbook for a known month
  - confirm `/admin/login` returns 200

## 2026-05-08-r138 Ready

- Scope: improve shared mobile usability for authenticated admin and teacher pages.
- Business impact:
  - Phone-width pages now stack dense grid sections into one column.
  - Filter bars and form controls are easier to tap.
  - Wide tables stay in their own horizontal scroll areas instead of pushing the entire page sideways.
  - The mobile sidebar menu remains reachable near the top while scrolling.
  - No business logic or data writes changed.
- Files:
  - `app/responsive-layout.css`
- Verification before deploy:
  - `npm run build`
- Post-deploy verification:
  - open a teacher page and an admin list page on phone width and confirm controls do not crowd horizontally
  - confirm `/admin/login` returns 200

## 2026-05-08-r137 Ready

- Scope: make the teacher notice admin entry visible near the top of the left sidebar.
- Business impact:
  - Admin users see `Teacher Notices / 老师通知` under `Today / 今天`.
  - Finance users see `Teacher Notices / 老师通知` under their top `Today / 今天` group.
  - The duplicate lower placement was removed to keep the sidebar cleaner.
- Files:
  - `app/admin/layout.tsx`
- Verification before deploy:
  - `npm run build`
- Post-deploy verification:
  - open admin sidebar and confirm `Teacher Notices / 老师通知` appears near the top

## 2026-05-08-r136 Ready

- Scope: make teacher notices manageable from admin.
- Business impact:
  - Admin/finance can open `/admin/teacher-notices`.
  - Notices now support category, important flag, required acknowledgement, publish date, expiry date, active/archive status, and bilingual content.
  - Admin can see read/unread detail by teacher and reset read records when a notice needs renewed acknowledgement.
  - Teacher dashboard shows only the first two unread notices; full history remains under `/teacher/notices`.
- Files:
  - `app/admin/teacher-notices/page.tsx`
  - `app/admin/layout.tsx`
  - `app/teacher/page.tsx`
  - `app/teacher/notices/page.tsx`
  - `lib/teacher-notices.ts`
  - `tests/teacher-notices.test.ts`
- Verification before deploy:
  - `npx tsx --test tests/teacher-notices.test.ts`
  - `npm run build`
- Post-deploy verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh` or equivalent server-side health checks must confirm local/origin/server alignment and `/admin/login => 200`
  - open `/admin/teacher-notices` and confirm the notice list renders
  - open `/teacher/notices` and confirm teacher-facing history renders

## 2026-05-08-r135 Ready

- Scope: add a teacher-facing notice for the company-name update.
- Business impact:
  - Teachers see an unread company-name notice on `/teacher`.
  - Teachers can mark the notice as read.
  - Teachers can open `/teacher/notices` to review notice history.
- Files:
  - `app/teacher/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/notices/page.tsx`
  - `app/teacher/TeacherNoticeCardClient.tsx`
  - `app/api/teacher/notices/read/route.ts`
  - `lib/teacher-notices.ts`
  - `tests/teacher-notices.test.ts`
- Verification before deploy:
  - confirmed no existing teacher notice AppSetting rows would be overwritten
  - `npx tsx --test tests/teacher-notices.test.ts`
  - `npm run build`
- Post-deploy verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh` or equivalent server-side health checks must confirm local/origin/server alignment and `/admin/login => 200`
  - teacher portal should show the company-name notice until the current teacher marks it read

## 2026-05-08-r134 Ready

- Scope: fix package-ledger PDF export display for negative hour deductions.
- Business impact:
  - PDF package-ledger rows now format `-90` minutes as `-1h 30m`, matching the website ledger and the running balance.
  - Existing ledger transactions and remaining balances are unchanged.
- Files:
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `lib/package-ledger-format.ts`
  - `tests/package-ledger-format.test.ts`
- Verification before deploy:
  - real Dong Xinyi AEIS package ledger query confirms deductions are stored as `-90` minutes
  - uploaded PDF extraction confirms only the delta text was wrong while balances stepped down by 1h30m
  - `npx tsx --test tests/package-ledger-format.test.ts`
  - `npm run build`
- Post-deploy verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh` must confirm local/origin/server alignment and `/admin/login => 200`
  - re-export the same package ledger PDF and confirm the DEDUCT rows show `-1h 30m`

## 2026-05-08-r133 Ready

- Scope: update company name and sealed export stamp across generated documents.
- Business impact:
  - Parent invoice and receipt PDFs now show `GT Educational Institute Pte. Ltd.`.
  - Partner invoice and receipt PDFs now show `GT Educational Institute Pte. Ltd.`.
  - Parent statement, student detail, student schedule, package ledger, enrollment export, and student contract legal name now use the same company name.
  - Remittance `Account name` on invoice PDFs now uses `GT Educational Institute Pte. Ltd.`.
  - Sealed partner invoice PDF and sealed partner detail XLSX now use `public/gt_edu_seal.png`.
  - Logo files and document layout were not changed.
  - No billing amounts, invoice numbers, receipt numbers, approval logic, payment status, package deduction, scheduling, attendance, payroll, settlement, expense-claim, or OpenClaw logic changed.
- Validation:
  - confirmed uploaded invoice and receipt templates already show `GT Educational Institute Pte. Ltd.` in visible cells
  - scanned app/lib exports so the old company name no longer appears in system document generation code
  - confirmed sealed partner invoice/detail exports now reference `public/gt_edu_seal.png`
  - `npx tsc --noEmit`
  - `npx next build`
  - task doc: `docs/tasks/TASK-20260508-company-name-and-seal-update.md`
- Deploy check:
  - post-deploy `/admin/login` should return 200
  - production QA should generate one parent invoice PDF and one sealed partner invoice PDF, then confirm the company name and seal

## 2026-05-08-r132 Ready

- Scope: add payment status, period filters, and Excel export to the finance document center.
- Business impact:
  - `/admin/finance/documents` now shows `Payment status / 收款状态` for invoices and receipts.
  - Payment status is derived from finance-approved receipts: paid, partial, unpaid, pending approval, or rejected.
  - Finance can filter by payment status plus date range before reviewing PDFs.
  - Finance can export the current filtered document list as Excel for Statement of Accounts and invoice/receipt follow-up.
  - The export includes document amount, approved received amount, pending/rejected receipt amount, remaining unpaid amount, receipt count, PDF link, and source page.
  - No invoice/receipt creation, approval, rejection, deletion, package deduction, student billing, partner settlement, payroll, expense-claim, scheduling, attendance, contract, or OpenClaw logic changed.
- Validation:
  - queried real invoice rows with the new status logic: 25 invoices total; paid 15, partial 1, unpaid 8, rejected 1
  - `npx tsx --test tests/finance-documents.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
  - task doc: `docs/tasks/TASK-20260508-finance-documents-payment-status-export.md`
- Deploy check:
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` should confirm local/origin/server alignment and `/admin/login => 200`
  - production QA should open `/admin/finance/documents?type=INVOICE&paymentStatus=UNPAID`, confirm rows render, then download `/api/exports/finance-documents?type=INVOICE&paymentStatus=UNPAID`

## 2026-05-07-r131 Ready

- Scope: add an all-paid expense-claims view that includes archived paid claims.
- Business impact:
  - Finance can open `All paid expenses / 所有已付款报销` from the expense-claims quick filters.
  - Advanced filters now expose `Archive view / 归档视图`: active only, archived only, or include archived.
  - `Paid / 已付款` plus `Include archived / 包含已归档` shows the complete paid history instead of only active or only archived claims.
  - CSV export follows the same archived filter, so exported paid history matches the visible list.
  - Claim approval, payment marking, archive status, attachment files, student billing, scheduling, attendance, contracts, payroll, settlement, and OpenClaw are unchanged.
- Validation:
  - queried real paid expense claims: 41 active, 1 archived, 42 total
  - `npx tsx --test tests/expense-claims.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
  - task doc: `docs/tasks/TASK-20260507-expense-claims-all-paid-archive-view.md`
- Deploy check:
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm local/origin/server alignment and `/admin/login => 200`
  - production QA should open `/admin/expense-claims?status=PAID&archived=include` and confirm the count includes active and archived paid claims

## 2026-04-29-r130 Ready

- Scope: clarify quick-schedule student conflict wording.
- Business impact:
  - quick-schedule candidate rows now say `学生时间冲突（不是所选教室被占用）/ Student time conflict, not selected-room conflict`
  - the existing session details still show the original class room, but are labeled as `Existing session`
  - this prevents staff from reading `Room 1` in the conflict detail as the selected `Room 3` being ignored
  - no room selection, room conflict detection, teacher availability, scheduling write, attendance, package, billing, contract, payroll, settlement, or OpenClaw logic changed
- Validation:
  - checked the reported real window: `2026-05-14 17:30-19:00`, Orchard Plaza `Room 3` has no overlapping session
  - confirmed the displayed `Room 1` row is the student's overlapping existing session at `18:00-19:30`
  - `npx tsx --test tests/quick-schedule-messages.test.ts tests/quick-schedule-execution.test.ts tests/availability-conflict.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
  - task doc: `docs/tasks/TASK-20260429-quick-schedule-student-conflict-room-wording.md`
- Deploy check:
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm local/origin/server alignment and `/admin/login => 200`
  - production QA should retry the same quick-schedule search and confirm the conflict reads as student-time conflict, not selected-room occupancy

## 2026-04-25-r129 Ready

- Scope: make Todo Center academic-management lane switching instant and fix mismatched counts.
- Business impact:
  - `学业管理提醒` 的 `全部学生 / 自己学生 / 合作方学生 / 未分类` 点击后不再整页刷新
  - 筛选按钮数量改为当前提醒行数，不再混用有效课包学生总数
  - 移除原来最多只显示 20 条提醒的截断，避免学生显示不全
  - 保留 URL `academicLane` 状态，复制链接仍能打开对应分流
  - 不改变 OpenClaw、排课创建、点名、扣费、合同、工资、合作方结算或财务审批逻辑
- Validation:
  - confirmed the old section mixed active-student counts with alert-row counts and capped rows at 20
  - scanned Todo Center for remaining `todoHref` lane links; only pagination and lazy conflict-load links remain
  - `npx tsx --test tests/academic-management.test.ts tests/parent-feedback-quality.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
  - task doc: `docs/tasks/TASK-20260425-todo-academic-alert-filter-counts.md`
- Deploy check:
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm local/origin/server alignment and `/admin/login => 200`
  - production QA should click `/admin/todos` academic lane buttons and confirm the page does not reload and counts match visible rows

## 2026-04-25-r128 Ready

- Scope: correct academic management own/partner grouping to use student type instead of package settlement mode.
- Business impact:
  - 今日工作台 `学业管理提醒` 的 `自己学生 / 合作方学生` 筛选现在按学生类型分流
  - `学业管理月报` 使用同一套学生类型分流规则
  - 新增 `未分类` 分流，用来暴露学生类型为空或无法识别的有效课包学生
  - 课包 `settlementMode` 只作为异常提示，不再决定学业管理归属
  - 不改变 OpenClaw、排课创建、点名、扣费、合同、工资、合作方结算或财务审批逻辑
- Validation:
  - queried active-package students by the corrected rule: 17 own, 29 partner, 4 unclassified
  - confirmed warning rows are missing-student-type cleanup items: 张磊, lily, 邵楚然, 李东恒
  - `npx tsx --test tests/academic-management.test.ts tests/parent-feedback-quality.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
  - task doc: `docs/tasks/TASK-20260425-academic-management-student-type-lanes.md`
- Deploy check:
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm local/origin/server alignment and `/admin/login => 200`
  - production read-only QA should confirm `/admin/todos` and `/admin/reports/academic-management` render the corrected `未分类` filter and warning labels

## 2026-04-25-r127 Ready

- Scope: split academic management handling between own/direct students and partner students.
- Business impact:
  - 今日工作台 `学业管理提醒` 增加 `全部学生 / 自己学生 / 合作方学生` 分流筛选
  - `学业管理月报` 增加同样的学生类型筛选
  - 提醒和月报行内显示学生类型，方便教务把自己学生和合作方学生分开处理
  - 分流依据优先使用课包 `settlementMode`，与真实结算流程一致
  - 不改变 OpenClaw、排课创建、点名、扣费、合同、工资、合作方结算或财务审批逻辑
- Validation:
  - queried production data: 77 students, 51 active hour packages with remaining balance, 19 direct/own active packages, 32 partner active packages
  - confirmed student types include `合作方学生`, `自己学生-新生`, `自己学生-留学+课程`, and legacy `直客学生`
  - `npx tsx --test tests/academic-management.test.ts tests/parent-feedback-quality.test.ts`
  - `npm run build`
  - task doc: `docs/tasks/TASK-20260425-academic-management-own-vs-partner.md`
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
- Deploy check:
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm local/origin/server alignment and `/admin/login => 200`
  - production read-only QA should confirm `/admin/todos` renders `学业管理提醒` and student detail renders `学业管理档案`

## 2026-04-25-r124 Ready

- Scope: add a WeChat-friendly copy format for admin feedback forwarding.
- Business impact:
  - 教务点击 `复制微信版反馈` 时，粘贴到微信的是家长可读分段文本，而不是后台记录格式
  - 新五段反馈会按 `本节课重点`、`目前发现`、`课堂表现`、`下一步计划`、`家长需要知道` 输出
  - 旧非结构化反馈会降级成 `课堂反馈` + `课后作业`，避免历史数据复制失败
  - 原来的内部记录复制保留为 `复制内部记录`
  - 不改变反馈提交、已转发状态、点名、工资、作业或数据库结构
- Validation:
  - tested WeChat text generation against real recent structured feedback
  - tested fallback formatting against old unstructured feedback
  - verified the admin feedback page renders WeChat preview and both copy buttons
  - `npm run build`
  - task doc: `docs/tasks/TASK-20260425-admin-feedback-wechat-copy.md`

## 2026-04-25-r123 Ready

- Scope: replace the teacher feedback editable template with five separate answer boxes and an automatic parent-facing preview.
- Business impact:
  - 老师不用再删除 `Hint / 提示`，提示固定显示在输入框外
  - 每段反馈都有独立输入框：`Lesson focus`、`Current finding`、`Class performance`、`Next plan`、`What parents should know`
  - 系统自动把五段答案拼成家长可见反馈预览，并保存到原有反馈字段
  - 不改变点名、工资、反馈转发队列、作业字段或数据库结构
- Validation:
  - tested parsing for old Chinese headings, bilingual headings, and unstructured legacy text
  - tested empty values return all five missing labels
  - verified a real teacher session page renders five answer boxes and a preview
  - refreshed SOP screenshot `docs/assets/teacher-sop-20260425/04-parent-feedback-form.png`
  - `npm run build`
  - task doc: `docs/tasks/TASK-20260425-teacher-feedback-section-inputs.md`

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

## 2026-07-13-r237 Live

- Scope: add the complete first teacher-mobile workbench for own availability, leave/reschedule requests, personal expenses, and monthly teaching history.
- Permission: every new endpoint requires a TEACHER role and linked teacher profile; management users and unauthenticated callers cannot enter the teacher-only APIs.
- Reuse: availability, Ticket, ExpenseClaim, upload storage, audit, approval/payment, Session, attendance, and feedback data all remain in their existing system of record.
- Safety: leave/reschedule creates or updates a coordination Ticket only; expense submission never grants approval/payment rights; teaching history excludes payroll amounts.
- Data evidence: 46 linked teacher accounts are eligible, with 179 future-30-day sessions, 107 current-month completed sessions, 664 future availability slots, and existing teacher expense records available. Active teacher miniapp bindings remain 0 until rollout.
- Validation: 28 focused tests, TypeScript, miniapp syntax, 26-page audit, exact document sync, diff checks, read-only reconciliation, and local/production 191-page builds pass. Production `fc0ee9f` has 101 migrations, PM2 online, health 200, and one cron; all four teacher endpoints return ADMIN 403 and anonymous 401, while ADMIN schedule remains 200. First bound-teacher phone regression remains.
