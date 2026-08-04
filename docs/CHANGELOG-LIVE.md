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

## 2026-08-04-r309

- Release ID: `2026-08-04-r309`
- Date/Time (Asia/Singapore): `2026-08-04`
- Deployment status: `READY`
- Scope: replace free-text next-month teacher preferences with qualified teacher IDs and add a controlled, versioned 18-scenario bilingual parent-message catalog across the Web and Staff Mini Program.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260804213000_add_teacher_preferences_and_communication_templates/migration.sql`
  - `lib/monthly-scheduling.ts`
  - `lib/parent-communication-templates.ts`
  - `lib/parent-communication-center.ts`
  - `app/admin/communications/templates/page.tsx`
  - `app/admin/monthly-scheduling/page.tsx`
  - `miniapp/boss-academic-parent/pages/staff-communication-templates/`
  - `docs/SOP-教务-老师选择与家长固定话术流程-20260804.md`
- Risk impact (if any): Moderate and isolated to the existing next-month preference fields and message preparation surfaces. Teacher IDs are validated against the item's course and only influence candidate ordering. Templates generate clipboard text but never send automatically. Formal scheduling, package balances, attendance, deductions, finance, contracts, payroll, tickets, and historical lessons remain unchanged.
- Verification: Prisma, TypeScript, focused tests, full tests, Mini Program release audit, JavaScript syntax checks, `git diff --check`, and production build.
- Rollback point: `32b6a12` (monthly scheduling proxy SOP baseline).

## 2026-08-04-r308

- Release ID: `2026-08-04-r308`
- Date/Time (Asia/Singapore): `2026-08-04`
- Deployment status: `READY`
- Scope: let authorized Academic staff record a parent's next-month preference and ranked concrete-time choices from WeChat or phone replies on the Web and Staff Mini Program, with source evidence and operator audit fields.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260804183000_add_monthly_scheduling_proxy_audit/migration.sql`
  - `lib/monthly-scheduling.ts`
  - `app/admin/monthly-scheduling/page.tsx`
  - `app/api/miniapp/staff/monthly-scheduling/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-monthly-scheduling-proxy/`
  - `docs/tasks/TASK-20260804-monthly-scheduling-parent-proxy-entry.md`
- Risk impact (if any): Moderate and isolated to the existing next-month scheduling workflow. Staff proxy entry uses the same availability validation, concrete-offer generation, serializable 24-hour hold, conflict checks, and stale-state guards as direct parent entry. It cannot overwrite matched or scheduled work and never creates or changes a formal Session. Packages, balances, attendance, deductions, reminders, contracts, invoices, receipts, payroll, tickets, and historical lessons remain unchanged.
- Verification: Prisma formatting and client generation, TypeScript, all 331 repository tests, the 57-page Mini Program release audit, `git diff --check`, and the complete 235-page production build passed.
- Rollback point: `c31a5c9` (`2026-08-04-r307` concrete-option workflow baseline).

---

## 2026-08-04-r307

- Release ID: `2026-08-04-r307`
- Date/Time (Asia/Singapore): `2026-08-04`
- Deployment status: `READY`
- Scope: reduce repeated parent-Academic time negotiation by turning a submitted change request into up to five qualified concrete teacher/time options, letting the parent rank up to three choices, holding the first available choice for 24 hours, and routing Academic into the existing formally validated scheduling page with safe prefills.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260804123000_add_monthly_scheduling_offers/migration.sql`
  - `lib/monthly-scheduling.ts`
  - `app/admin/monthly-scheduling/page.tsx`
  - `app/api/miniapp/monthly-scheduling/route.ts`
  - `app/api/miniapp/staff/monthly-scheduling/route.ts`
  - `miniapp/boss-academic-parent/pages/monthly-scheduling/`
  - `miniapp/boss-academic-parent/pages/staff-monthly-scheduling/`
  - `miniapp/boss-academic-parent/pages/staff-student-scheduling/staff-student-scheduling.js`
  - `docs/tasks/TASK-20260804-monthly-scheduling-concrete-options.md`
- Risk impact (if any): Moderate and isolated to the new monthly-scheduling offer table and the existing new monthly-scheduling workflow. Parent choices create only temporary offer holds and never create, cancel, or modify a formal Session. Academic still completes scheduling through the original qualification, date-availability, student/teacher/room conflict, appointment, package, and duplicate checks. Existing packages, balances, attendance, reminders, contracts, invoices, receipts, payroll, tickets, and historical lessons are unchanged.
- Verification: Prisma schema validation, TypeScript, 19 focused tests, all 328 repository tests, three Mini Program JavaScript syntax checks, the 56-page Mini Program release audit, `git diff --check`, and the complete 235-page production build passed.
- Rollback point: `2aa09cf08d63dd5cdf3d3db6006e7598c8db59e4` (`2026-08-04-r306` code and SOP baseline).

---

## 2026-08-04-r306

- Release ID: `2026-08-04-r306`
- Date/Time (Asia/Singapore): `2026-08-04`
- Deployment status: `READY`
- Scope: add a controlled next-month scheduling confirmation workflow across the Web, Parent Mini Program, Staff Mini Program, and teacher availability surfaces, with one response per student/course and read-only staffing visibility for Finance.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260803193000_add_monthly_scheduling_campaign/migration.sql`
  - `lib/monthly-scheduling.ts`
  - `lib/monthly-scheduling-access.ts`
  - `app/admin/monthly-scheduling/`
  - `app/api/miniapp/monthly-scheduling/`
  - `app/api/miniapp/staff/monthly-scheduling/`
  - `miniapp/boss-academic-parent/pages/monthly-scheduling/`
  - `miniapp/boss-academic-parent/pages/staff-monthly-scheduling/`
  - `docs/tasks/TASK-20260804-next-month-scheduling-confirmation.md`
- Risk impact (if any): Moderate and isolated to the new demand-confirmation tables, new workbench/API routes, two new Mini Program pages, and the teacher availability horizon. Parent responses never mutate formal lessons; shared packages remain student/course-specific; teacher capacity is allocated once across courses; Finance is read-only; no message is sent automatically; existing packages, balances, attendance, contracts, invoices, payroll, tickets, and sessions are not rewritten.
- Verification: 22 focused tests, 135 backend tests, and all 325 repository tests passed. TypeScript, Prisma schema validation, the 56-page Mini Program release audit, `git diff --check`, and the complete 235-page production build passed.
- Rollback point: `468e56f` (production-aligned feature baseline before this release candidate).

---

## 2026-08-03-r305

- Release ID: `2026-08-03-r305`
- Date/Time (Asia/Singapore): `2026-08-03`
- Deployment status: `READY`
- Scope: replace the missing Academic scheduling entry path with a 54-page, 22-step click-by-click beginner guide that starts at login and shows exactly how to open Students, Full List, search, Student Detail, Quick Schedule, and Scheduling Work Orders.
- Key files:
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.html`
  - `output/pdf/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.pdf`
  - `docs/assets/sop-academic-scheduling-20260803/annotated/`
  - `tests/training-center.test.ts`
  - `docs/tasks/TASK-20260803-academic-scheduling-click-entry.md`
- Risk impact (if any): Low and limited to Academic training content and retraining version `20260803C`. No scheduling, ticket, package, finance-gate, attendance, payroll, contract, permission, parent-visible, or Mini Program business logic changed.
- Verification:
  - the guide contains 22 complete Chinese click steps, a language divider, and 22 complete English click steps across 54 non-blank pages;
  - four new annotated real Web screenshots show Dashboard → Students, Full List/search/Apply/student name, Quick Schedule, and Scheduling Work Orders;
  - page-image, representative full-page, and contact-sheet inspection found no blank, clipped, or unreadable pages;
  - focused tests, full repository tests, TypeScript, production build, Mini Program audit, and `git diff --check` passed.
- Rollback point: `5583f8fd5a798affe971b8d3d61f562808025e4e` (`2026-08-03-r304` production head).

---

## 2026-08-03-r304

- Release ID: `2026-08-03-r304`
- Date/Time (Asia/Singapore): `2026-08-03`
- Deployment status: `READY`
- Scope: replace the five-step generic Academic scheduling guide and Mini Program screenshots with a 40-page Web-only beginner manual covering first scheduling, continuation, single lessons, rescheduling, cancellation/leave, teacher replacement, conflict resolution, ticket completion, and daily handover.
- Key files:
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.html`
  - `output/pdf/SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.pdf`
  - `output/pdf/00-SGT网页端逐功能培训目录-中英文版-20260803.pdf`
  - `docs/assets/sop-academic-scheduling-20260803/`
  - `tests/training-center.test.ts`
  - `docs/tasks/TASK-20260803-academic-web-scheduling-sop.md`
- Risk impact (if any): Low and limited to Academic training content and this module's retraining version. No live scheduling, ticket, package, finance-gate, attendance, payroll, contract, parent-visible data, permission, or Mini Program business logic changes.
- Verification:
  - the scheduling guide contains 15 complete Chinese steps, a language divider, and 15 complete English steps across 40 non-blank pages;
  - nine annotated real Web screenshots cover the scheduling queue, ticket action, coordination, Quick Schedule, single create, rescheduling, Conflict Center, official schedule, and handover;
  - page-image and contact-sheet inspection found no blank, clipped, or unreadable pages;
  - the downloadable Web catalogue shows the new scheduling title while the other 34 module titles remain unchanged;
  - 22 focused training tests and all 307 repository tests passed;
  - TypeScript, `git diff --check`, the 231-page production build, and the 54-page Mini Program release audit passed.
- Rollback point: `737943a6a1e50cd273b7a501c662996e3bbd703d` (`2026-08-03-r303` production head).

---

## 2026-08-03-r303

- Release ID: `2026-08-03-r303`
- Date/Time (Asia/Singapore): `2026-08-03`
- Deployment status: `READY`
- Scope: rebuild all 35 current training guides as single-function beginner SOPs with complete Chinese-first and English-second sections, separate Web and Mini Program libraries, and add downloadable platform catalogues.
- Key files:
  - `lib/training-center.ts`
  - `app/training/page.tsx`
  - `app/training/library/page.tsx`
  - `app/api/training/catalogs/[platform]/route.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-*-20260803.html`
  - `output/pdf/*20260803.pdf`
  - `docs/tasks/TASK-20260803-step-by-step-training-library.md`
- Risk impact (if any): Low to moderate and limited to training content, retraining version state, PDF delivery, and training-centre presentation. No operational permission, student data, finance, contract, package, attendance, payroll, scheduling, parent-visible business data, or Mini Program business logic changes.
- Verification:
  - 35/35 registered module PDFs and two platform catalogues generated;
  - 37 PDFs / 664 pages checked for page count, required language divider text, blank pages, and file presence;
  - 374 screenshot references checked with zero missing files;
  - representative Web, Mini Program, Teacher, and catalogue contact sheets visually inspected;
  - 21 focused training tests and all 306 repository tests passed;
  - TypeScript, Mini Program release audit, `git diff --check`, and the 231-page production build passed.
- Rollback point: `1414aed68176e52165923c25d6de574203a6d5c8` (`2026-08-03-r302` production-aligned head).

---

## 2026-08-03-r302

- Release ID: `2026-08-03-r302`
- Date/Time (Asia/Singapore): `2026-08-03`
- Deployment status: `READY`
- Scope: add same-day future-class recovery to the parent communication sync, combine explicitly linked siblings into one labelled parent reminder, and preserve audited correction tasks when a frequently adjusted course changes after sending.
- Key files:
  - `lib/parent-communication-center.ts`
  - `tests/parent-communication-center.test.ts`
  - `docs/tasks/TASK-20260803-same-day-family-course-reminders.md`
- Risk impact (if any): Moderate and isolated to manual communication-task generation. No message is sent automatically, no parent relationship is inferred from a shared package, and no schedule, attendance, package, finance, contract, payroll, parent login, or historical evidence record is changed.
- Verification:
  - focused communication suite passed 21 tests;
  - backend regression passed 132 tests;
  - full repository suite passed 304 tests;
  - `npx tsc --noEmit`, `git diff --check`, and the complete 231-page production build passed.
- Rollback point: `b00b13c9f40ecb08cc93829a44bb17d9c5001b08` (`2026-07-31-r301` production head).

---

## 2026-07-31-r301

- Release ID: `2026-07-31-r301`
- Date/Time (Asia/Singapore): `2026-07-31`
- Deployment status: `READY`
- Scope: include Business Accounts invoices and receipts in the central Finance Documents list, filters, PDF links, source-workspace links, payment statuses, and Excel exports without moving or rewriting the source records.
- Key files:
  - `lib/finance-documents.ts`
  - `app/admin/finance/documents/page.tsx`
  - `app/api/exports/finance-documents/route.ts`
  - `tests/finance-documents.test.ts`
  - `docs/tasks/TASK-20260731-business-finance-documents.md`
- Risk impact (if any): Low and limited to read-only finance-document aggregation and export presentation. Business Account drafts remain hidden; issued, paid, partial, and void documents are represented truthfully. Existing Business Accounts records, invoice and receipt creation, payment proofs, partner settlement, parent billing, Credit Notes, approvals, package balances, attendance, payroll, and scheduling are unchanged.
- Verification:
  - Read-only production reconciliation confirmed Shanghai Xinzhuo Si has three paid Business Account invoices and receipts, while the central Finance Documents aggregator previously returned no matching partner invoices.
  - 30 focused finance, billing, Credit Note, receipt, and settlement tests passed.
  - All 301 repository tests passed.
  - `npx tsc --noEmit` passed.
  - `git diff --check` passed.
  - `npm run build` passed and generated 231 pages.
- Rollback point: `b38c2417ee65fc2264697bdbf406b1c3a30f767c` (`2026-07-29-r300` production head).

---

## 2026-07-29-r300

- Release ID: `2026-07-29-r300`
- Date/Time (Asia/Singapore): `2026-07-29`
- Deployment status: `READY`
- Scope: prevent unlinked teacher accounts from crashing the teacher portal, surface exact profile-link exceptions to managers, strengthen training-PDF delivery, and repair mobile language, login-form, and favicon polish.
- Key files:
  - `lib/auth.ts`
  - `app/teacher/profile-required/page.tsx`
  - `app/admin/manager/users/page.tsx`
  - `app/api/admin/manager/users/route.ts`
  - `app/api/admin/manager/users/[id]/route.ts`
  - `app/api/training/sops/[code]/route.ts`
  - `app/admin/login/_components/AdminLoginClient.tsx`
  - `app/responsive-layout.css`
  - `app/favicon.ico/route.ts`
  - `tests/training-center.test.ts`
  - `docs/tasks/TASK-20260729-teacher-portal-resilience.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Moderate and limited to teacher-profile access gating plus presentation/delivery headers. Four existing TEACHER accounts remain intentionally unlinked until a manager confirms the exact teacher profile. No teacher mapping is guessed and no billing, receipt, package, attendance, payroll calculation, scheduling, Full Care, or mini-program business workflow changes.
- Verification:
  - `npx tsc --noEmit`
  - `npm run test:backend` (129 passed)
  - focused mini-program and training tests (113 passed)
  - integrated final-base repository suite (298 passed)
  - `npm run miniapp:audit-release` (54 pages, zero errors)
  - `npm run build` (231 static pages generated)
  - post-deploy authenticated orphan-teacher redirect, manager warning, PDF 200/304 headers, mobile layout, login-form and favicon checks
- Rollback point: `595c80a1fb0d9ce58e3363223122359326a992af` (`2026-07-29-r299` production-aligned head).

---

## 2026-07-29-r299

- Release ID: `2026-07-29-r299`
- Date/Time (Asia/Singapore): `2026-07-29 12:24`
- Deployment status: `LIVE`
- Scope: make partner receipt creation use the adjusted invoice net after issued Credit Notes, update receipt values when Finance selects another invoice, and recalculate the authoritative net again on submit.
- Key files:
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/admin/reports/partner-settlement/billing/PartnerReceiptFields.tsx`
  - `lib/partner-receipt-net.ts`
  - `tests/partner-receipt-net.test.ts`
  - `docs/tasks/TASK-20260729-partner-receipt-credit-net.md`
- Risk impact (if any): Low to moderate and limited to new partner-receipt creation. Existing invoices, Credit Notes, receipts, payment records and approvals are unchanged. Parent receipts, package billing, attendance, scheduling, payroll and partner settlement calculations are unchanged.
- Verification: 10 focused finance tests and all 295 repository tests passed; TypeScript, `git diff --check` and the complete 229-page production build passed. Runtime feature commit `152024fb2b7626b09274e68b5d0d40e291a7dee6` deployed with PM2 PID `2211224` and `/admin/login` returned HTTP 200. A post-deploy read-only production check confirmed `RGT-202606-0019` remains SGD 18,540 original less issued Credit Note `RGT-CN-202607-0001` of SGD 270 = SGD 18,270 net, its matching payment proof remains present, and no receipt was created during verification.
- Rollback point: `ad9af64021f0dd33639d073d443634288580446e` (`2026-07-29-r298` production-aligned head).

---

## 2026-07-29-r298

- Release ID: `2026-07-29-r298`
- Date/Time (Asia/Singapore): `2026-07-29 11:54`
- Deployment status: `LIVE`
- Scope: complete the Academic/CS curriculum with two beginner-safe bilingual workflows, assign all existing Academic specialist SOPs to CS training, and organise the role into 12 work chains.
- Key files:
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `tests/training-center.test.ts`
  - `docs/SOP-教务-*-中英文培训版-20260729.html`
  - `output/pdf/SOP-教务-*-中英文培训版-20260729.pdf`
  - `docs/培训中心/`
  - `docs/tasks/TASK-20260729-academic-complete-training.md`
- Risk impact (if any): Low to moderate and limited to training access and retraining. CS gains learning access to relevant Academic SOPs but no Finance approval, payment, signing, scheduling, package, attendance, or other operational permission.
- Verification: 35/35 bilingual PDFs exist and total 365 pages. Both new ten-page guides and the four-page 35-module catalogue passed extracted-text, non-blank-page, and contact-sheet inspection. Registry checks confirm ADMIN 35, CS 20, and TEACHER 11 modules. All 126 backend tests, TypeScript, and the complete 229-page production build passed. Runtime feature commit `857bb8584870fd4afd4f82a944fdd4a430adee2c` deployed with PM2 PID `2197584`; `/admin/login` returned HTTP 200. Authenticated production libraries showed exactly 35 ADMIN and 20 CS module cards at release `20260729D`. ADMIN and CS downloaded both new PDFs with HTTP 200; CS downloaded all seven newly assigned Academic specialist PDFs with HTTP 200 and received HTTP 403 for `FINANCE_MASTER` and `TEACHER_REPORTS_ASSESSMENTS`. Temporary verification-session residue was 0.
- Rollback point: `165e933db9ebd10907d5dea559099d277ec35715` (`2026-07-29-r297` production-aligned head).

---

## 2026-07-29-r297

- Release ID: `2026-07-29-r297`
- Date/Time (Asia/Singapore): `2026-07-29 11:45`
- Deployment status: `LIVE`
- Scope: give ADMIN complete training-library oversight and expand the teacher curriculum with four detailed bilingual workflow modules covering daily start, scheduling, reports, and finance.
- Key files:
  - `lib/training-center.ts`
  - `app/training/library/page.tsx`
  - `scripts/build-bilingual-training-sops.mjs`
  - `tests/training-center.test.ts`
  - `docs/assets/sop-teacher-complete-20260729/`
  - `docs/SOP-老师-*-中英文培训版-20260729.html`
  - `output/pdf/SOP-老师-*-中英文培训版-20260729.pdf`
  - `docs/培训中心/`
  - `docs/tasks/TASK-20260729-admin-full-library-and-teacher-depth.md`
- Risk impact (if any): Low to moderate and limited to training access and retraining. ADMIN can see all training PDFs but receives no new operational permission. Release `20260729C` intentionally requires current-version acknowledgement.
- Verification: 15 real production teacher pages were captured with the test-teacher account and red bilingual callouts; temporary session residue was 0. Four new teacher PDFs rendered as 10 pages each and passed extracted-text, non-blank-page, and contact-sheet inspection. The catalogue rendered without clipping. Registry totals are 33 modules / 345 pages / 33 ADMIN-visible / 11 TEACHER-visible. All 124 backend tests, TypeScript, and the complete 229-page production build passed. Runtime feature commit `e55fed18c7e481c320d94945f3e9ae0e3618b06f` deployed with PM2 PID `2184481`; `/admin/login` returned HTTP 200. Authenticated production checks confirmed ADMIN sees 33 modules and can download a TEACHER-only PDF; TEACHER sees 11 modules, downloads all four new teacher PDFs, and receives HTTP 403 for `FINANCE_MASTER`. Temporary production verification-session residue was 0.
- Rollback point: `4ef88cd930d6bfbb8172a4d14f57478bd39c1272` (`2026-07-29-r296` production-aligned head).

---

## 2026-07-29-r296

- Release ID: `2026-07-29-r296`
- Date/Time (Asia/Singapore): `2026-07-29 10:31`
- Deployment status: `LIVE`
- Scope: repair the parent mini-program invite route and replace incomplete or misleading mini-program training with 29 role-based, bilingual, step-by-step modules.
- Key files:
  - `app/api/admin/students/[id]/parent-portal/invites/route.ts`
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `tests/training-center.test.ts`
  - `docs/SOP-小程序-*-中英文培训版-20260729.html`
  - `docs/assets/sop-miniapp-binding-20260729/`
  - `output/pdf/SOP-小程序-*-中英文培训版-20260729.pdf`
  - `docs/培训中心/`
  - `docs/tasks/TASK-20260729-training-completeness-and-miniapp-binding.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to moderate. The only operational change corrects the parent invite route from an unregistered page to the existing bind page. No role, permission, billing, receipt, package, attendance, payroll, scheduling, Full Care record, or parent-visible business data changes.
- Verification: 122 backend tests passed; TypeScript passed; the complete 229-page production build passed. All 29 assigned bilingual PDFs exist and total 305 pages. The parent binding guide, Finance boundary guide, and four-column 29-module catalogue passed rendered-page inspection. Automated checks prove every referenced training screenshot exists, the new guides use workflow-specific evidence, all 198 visible system pages remain mapped, and the parent invite path matches the registered mini-program page. Production deployed at runtime feature commit `2c6badf0b4fba74e2b52d0976c28863b40f83310`; PM2 PID `2169138` was online and `/admin/login` returned HTTP 200. Authenticated `/training` and `/training/library` returned HTTP 200 with release `20260729B` and 26 ADMIN-accessible modules. The parent-binding PDF returned HTTP 200 as a 1,258,187-byte `application/pdf` attachment; TEACHER access returned HTTP 403. A temporary parent invite returned `/pages/bind/bind?token=...`; temporary invite and session residue were both 0 after cleanup.
- Rollback point: `fcd4c09cabf0e03630751e705c47e3ad4929f8cc` (`2026-07-29-r295` production-aligned head).

---

## 2026-07-29-r295

- Release ID: `2026-07-29-r295`
- Date/Time (Asia/Singapore): `2026-07-29 09:25`
- Deployment status: `LIVE`
- Scope: complete eight role-based mini-program learning paths and upgrade the training centre from document acknowledgement to structured HR competency assessment.
- Key files:
  - `lib/training-center.ts`
  - `app/training/page.tsx`
  - `app/training/actions.ts`
  - `app/training/manage/page.tsx`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/SOP-小程序-*-中英文培训版-20260729.html`
  - `output/pdf/SOP-小程序-*-中英文培训版-20260729.pdf`
  - `docs/培训中心/培训体系HR审计与改进-20260729.md`
  - `docs/tasks/TASK-20260729-training-hr-quality-and-miniapp-paths.md`
- Risk impact (if any): Low to moderate and limited to training. Practical submission and manager sign-off are intentionally stricter. Existing operational roles, permissions, business data, scheduling, attendance, packages, contracts, finance, payroll, Full Care, and parent-visible workflows are unchanged.
- Verification: 28 assigned bilingual PDFs passed existence, minimum-page, Chinese, and English checks: 296 pages total. The new Finance mini-program guide rendered as nine pages and passed full contact-sheet inspection; the 28-module catalogue rendered without clipping. All 119 backend tests, TypeScript, and the complete 229-page local and production builds passed. Runtime feature commit `56da50e05568d5a47331a95c7c2b3e91996d3314` deployed with PM2 PID `2145187`; `/admin/login` returned HTTP 200. Authenticated production `/training` returned 200 with 25 administrator-accessible modules, release `20260729`, recommended learning order, learning briefs, and estimated time. `/training/library` returned 200 with 25 role-allowed cards. The new Finance mini-program PDF returned 200 as a 1,347,605-byte `application/pdf` attachment; administrator access to the teacher-only PDF returned 403. Temporary production verification-session cleanup was 0.
- Rollback point: `dffd76ae4becd871a6c9bc736bea430deab3bf94` (`2026-07-29-r294` live).

---

## 2026-07-29-r294

- Release ID: `2026-07-29-r294`
- Date/Time (Asia/Singapore): `2026-07-29`
- Deployment status: `LIVE`
- Scope: replace the 17 short bilingual training outlines with zero-experience step-by-step guides and add a role-aware PDF Download Centre for staff.
- Key files:
  - `app/training/page.tsx`
  - `app/training/library/page.tsx`
  - `app/api/training/sops/[code]/route.ts`
  - `lib/training-center.ts`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/*中英文培训版-20260728.html`
  - `output/pdf/*中英文培训版-20260728.pdf`
  - `docs/培训中心/README.md`
  - `docs/tasks/TASK-20260729-beginner-training-pdfs-download-centre.md`
- Risk impact (if any): Low. PDF access remains authenticated and limited to the employee's primary and additional training roles. The new download response changes only Content-Disposition when explicitly requested. The release changes no operational permission, role assignment, business record, finance, package, schedule, attendance, payroll, Full Care, or parent-visible workflow.
- Verification: all 23 assigned bilingual PDFs passed file, page-count, English/Chinese text, and per-page content checks: 251 pages total. A representative nine-page guide passed rendered contact-sheet inspection with no blank or clipped pages. Runtime commit `3f9cfeb50a35d3bcd8a835b3c62e754224117059` deployed with PM2 PID `2133294`; `/admin/login` and authenticated `/training/library` returned HTTP 200. Production rendered 20 administrator-accessible role modules; inline view returned `inline`, download returned `attachment`, the downloaded 1,855,674-byte file began with `%PDF`, and an unauthorised teacher-only module returned HTTP 403. Temporary verification-session cleanup was 0. All 118 backend tests, TypeScript, and the complete 229-page local and production builds passed.
- Rollback point: `42aad183a4f1f4a0f8da768b5e94a470d3a331ea` (`2026-07-28-r293` live).

---

## 2026-07-28-r293

- Release ID: `2026-07-28-r293`
- Date/Time (Asia/Singapore): `2026-07-28`
- Deployment status: `LIVE`
- Scope: replace the submission-only training sign-off list with a complete staff training overview that includes employees who have not started.
- Key files:
  - `app/training/manage/page.tsx`
  - `lib/training-center.ts`
  - `tests/training-center.test.ts`
  - `docs/培训中心/README.md`
  - `docs/tasks/TASK-20260728-training-manager-overview.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low and read-only except for the existing manager approve/rework forms. No training rows are created automatically, no employee is marked complete, and no role, permission, business workflow, or operational data changes.
- Verification: production data confirms 56 staff and 0 current training-progress rows. The new page rendered all 56 staff and 378 assigned modules from those existing accounts. Runtime commit `29d2d5f13e0dc4bfe22579faf3df459822b663c6` deployed with PM2 PID `1953887`; `/admin/login` and the authenticated `/training/manage` page returned HTTP 200. The production manager page contained all 56 employee cards, the overview heading, the staff-not-started metric, and the manager's own record. All temporary manager sessions were deleted with 0 remaining. All 118 backend tests, TypeScript, and the 228-page production build passed.
- Rollback point: `d2c76f75e3972a94c4f6b631d25bd3734b281775` (`2026-07-28-r292` live).

---

## 2026-07-28-r292

- Release ID: `2026-07-28-r292`
- Date/Time (Asia/Singapore): `2026-07-28`
- Deployment status: `LIVE`
- Scope: make the complete staff training experience language-aware and give all 23 role modules a current Chinese-English training PDF.
- Key files:
  - `app/training/*`
  - `app/admin/manager/users/_components/UserTrainingRoleFormClient.tsx`
  - `lib/training-center.ts`
  - `docs/培训中心/*`
  - `docs/SOP-*-中英文*-20260728.html`
  - `output/pdf/*中英文*-20260728.pdf`
  - `scripts/build-bilingual-training-sops.mjs`
  - `docs/tasks/TASK-20260728-bilingual-staff-training.md`
- Risk impact (if any): Low and isolated to training presentation and training-version completion. The release changes no primary role, operational permission, scheduling, attendance, package, contract, finance, payroll, settlement, Full Care data, or parent-visible workflow. The unified `20260728` module release version intentionally requires affected staff to acknowledge the new bilingual edition.
- Verification: 17 new bilingual module PDFs produced 68 A4 landscape pages; all passed page-count, English/Chinese text, and full-page contact-sheet checks. The bilingual catalogue is 4 A4 landscape pages and passed text and full-page visual checks. All 117 backend tests, TypeScript, and the complete 228-page local and production builds passed. Runtime commit `b048612d250e9842467763c68411dd847f939134` deployed with PM2 PID `1939220`; `/admin/login` returned HTTP 200. Existing EN, ZH, and BILINGUAL staff accounts each returned `/training` 200 with the correct language combination and opened the common bilingual PDF with HTTP 200; all temporary verification sessions were deleted.
- Rollback point: `b9d9124f7120ffb36e4b92e211abdcbf402db22f` (`2026-07-28-r291` production-aligned documentation head).

---

## 2026-07-28-r291

- Release ID: `2026-07-28-r291`
- Date/Time (Asia/Singapore): `2026-07-28`
- Deployment status: `LIVE`
- Scope: correct the r290 PDF-generator packaging so production type checking ignores the optional Playwright-only documentation tool.
- Key files:
  - `scripts/build-training-operation-map.mjs`
  - `docs/tasks/TASK-20260728-training-map-build-packaging.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This renames a documentation generator from TypeScript to MJS; runtime training pages, database schema, permissions and business workflows are unchanged.
- Verification: the 228-page production build passes with the generator excluded from application type checking. Runtime commit `d2de30effed602d6a5d44614a76a213d5513d67d` deployed with PM2 PID `1880000`; `/admin/login` returned HTTP 200.
- Rollback point: `e8b137dca7ee6804ddfc4f5ed14db0a3b6b514c2` remains the last confirmed live application commit before r290/r291.

---

## 2026-07-28-r290

- Release ID: `2026-07-28-r290`
- Date/Time (Asia/Singapore): `2026-07-28`
- Deployment status: `LIVE`
- Scope: add independent multi-role training assignments and a complete employee-operation coverage map for every visible SGT page.
- Key files:
  - `app/api/admin/manager/users/[id]/training-roles/route.ts`
  - `app/admin/manager/users/_components/UserTrainingRoleFormClient.tsx`
  - `app/training/coverage/page.tsx`
  - `lib/training-center.ts`
  - `lib/training-operation-coverage.ts`
  - `prisma/migrations/20260728190000_add_staff_training_roles/migration.sql`
  - `docs/培训中心/*`
  - `docs/tasks/TASK-20260728-multi-role-operation-coverage.md`
- Risk impact (if any): Medium and isolated to training assignment. Additional training roles grant courses only and do not alter the user's primary role, workspace access or any operational permission. Teaching, scheduling, attendance, packages, finance, payroll, settlement and parent workflows are unchanged.
- Verification: TypeScript, all 117 backend tests and the 228-page production build pass. The operation-map audit classifies all 144 web pages and 54 WeChat miniapp pages (198 total) into 16 business-result flows with zero unmapped routes; the 19-page PDF passed text extraction and full-page contact-sheet review. In production, a CS account received temporary Finance training: assignment returned 200, the Finance training PDF returned 200, but the actual Finance workbench remained denied with a 307 redirect to the resource workspace. The assignment was restored and temporary sessions were removed.
- Rollback point: `e8b137dca7ee6804ddfc4f5ed14db0a3b6b514c2` (`2026-07-28-r289` documentation-aligned production head).

---

## 2026-07-28-r289

- Release ID: `2026-07-28-r289`
- Date/Time (Asia/Singapore): `2026-07-28`
- Deployment status: `LIVE`
- Scope: establish the controlled SGT staff training library and add a role-aware Training Center with protected SOP access, quizzes, practical evidence and manager sign-off.
- Key files:
  - `app/training/*`
  - `app/api/training/sops/[code]/route.ts`
  - `lib/training-center.ts`
  - `prisma/migrations/20260728150000_add_staff_training_progress/migration.sql`
  - `docs/培训中心/*`
  - `docs/SOP-*-20260728.html`
  - `docs/tasks/TASK-20260728-staff-training-center.md`
- Risk impact (if any): Medium and isolated to training. One additive training-progress table and internal authenticated pages are added. Scheduling, attendance, deductions, packages, contracts, invoices, receipts, payroll, expenses, settlement and parent data are unchanged.
- Verification: focused training/migration tests, all 114 backend tests, TypeScript and the 227-page production build passed. Runtime commit `49f9ff847aa1c7180f3f85818ae7d389a39d722a` deployed with PM2 PID `1863191`; `/admin/login` returned HTTP 200. Authenticated Admin and Teacher training pages returned 200, both roles could open an allowed protected PDF, a Teacher received 403 for a Finance-only PDF, an anonymous request received 401, and the checks created no training-completion rows.
- Rollback point: `af02b28` (`2026-07-28-r288` documentation head; runtime school-guide commit `526ab99`).

---

## 2026-07-28-r288

- Release ID: `2026-07-28-r288`
- Date/Time (Asia/Shanghai): `2026-07-28`
- Deployment status: `LIVE`
- Scope: expand the School Guide from an international-school-first directory into a complete Singapore education-system directory on web and miniapp.
- Key changes: add 13 official-source sectors covering preschool, MOE primary and secondary schools, independent and specialised pathways, JC/MI, SPED, private schools, PEIs, full-time madrasahs, ITE, polytechnics, arts institutions and autonomous universities; retain the existing international-school detail directory below.
- Risk impact: Low and isolated to public School Guide content and navigation. No database migration; no changes to authentication, parent, staff, teacher, scheduling, billing, package, payroll, communications or Ticket workflows.
- Verification: 13 focused School Guide tests, all 273 repository tests, 225-page production build, 54-page miniapp audit, diff check and 390px mobile browser review passed. Runtime commit `526ab99d6e821adf08d155fff8e027f0f9833ca8` deployed with PM2 PID `1736885`; School Guide home, directory and catalog returned HTTP 200, and the production catalog exposed 13 sectors and 43 existing school records. WeChat development version `1.0.20` uploaded successfully at 576,398 bytes.
- Rollback point: `1228583bfb4bd28b131cbb14ea6ae0fc8381c038` (`2026-07-27-r287` live lineage).

---

## 2026-07-27-r287

- Release ID: `2026-07-27-r287`
- Date/Time (Asia/Shanghai): `2026-07-27`
- Deployment status: `LIVE`
- Scope: remove internal names, process explanations and repeated disclaimer copy from the public School Guide on web and miniapp.
- Key changes: shorter task-led copy; no employee name in public UI; no IB source-page filter; no decorative compass; concise empty, comparison, consultation and plan states.
- Risk impact: Low and presentation-only. School facts, matching, inquiries, permissions, roles, scheduling, billing and all existing business workflows are unchanged.
- Verification: 225-page production build, 10 focused School Guide tests, all 270 repository tests, 54-page miniapp audit, diff check and 390px mobile visual review passed. Runtime commit `0c2c431f8cb65f3d5741f18eae14f83a0800b3da` deployed with PM2 PID `1492457`; `/school-guide`, assessment, cases, plan and catalog all returned HTTP 200. WeChat development version `1.0.19` uploaded successfully at 573,860 bytes.
- Rollback point: `1beeda8829181cc1efa44fb40ef18581983f31d2` (`2026-07-27-r286` live lineage).

---

## 2026-07-27-r286

- Release ID: `2026-07-27-r286`
- Date/Time (Asia/Shanghai): `2026-07-27`
- Deployment status: `LIVE`
- Scope: convert the public Singapore School Guide into a five-entry family decision workspace on web and WeChat miniapp.
- Key files:
  - `app/school-guide/*`
  - `lib/school-guide-match.ts`
  - `miniapp/boss-academic-parent/components/guide-nav/*`
  - `miniapp/boss-academic-parent/pages/guide-{home,assessment,cases,plan,schools}/*`
  - `docs/tasks/TASK-20260727-school-guide-decision-workspace.md`
- Risk impact: Low and isolated. This release changes only public School Guide presentation, deterministic matching and local plan storage. It does not alter authentication, roles, student records, scheduling, billing, payroll, communications or Tickets.
- Data safeguards: no admission probability is generated; matching includes only verified schools; real cases require consent, anonymization and human review; existing favorite storage keys remain compatible.
- Verification: 10 focused tests, 109 backend tests and 270 complete repository tests passed. The 225-page build, TypeScript, visual mobile/desktop browser checks and the 54-page miniapp audit passed. Runtime feature commit `085ddd03ed79ac830ad9586ae2152161926ae747` deployed with PM2 PID `1466219`; five production routes returned HTTP 200 and the catalog returned 43 schools with zero unpublished cases. WeChat development version `1.0.18` uploaded successfully at 577,499 bytes.
- Rollback point: `463b680d1c0c397b96edf48a849b0c92087c48e1` (`2026-07-27-r285` production lineage).

---

## 2026-07-27-r285

- Release ID: `2026-07-27-r285`
- Date/Time (Asia/Shanghai): `2026-07-27`
- Deployment status: `LIVE`
- Scope: add the public Singapore School Guide to the web and existing parent/staff miniapp, with official-source school profiles, pathway assessment, comparison, first-year cost ranges, privacy notice and inquiry handoff.
- Key files:
  - `app/school-guide/*`
  - `app/api/public/school-guide/*`
  - `lib/school-guide-data.ts`
  - `lib/school-guide-assessment.ts`
  - `miniapp/boss-academic-parent/pages/guide-*`
  - `miniapp/boss-academic-parent/app.json`
  - `tests/school-guide-*.test.ts`
  - `docs/tasks/TASK-20260727-singapore-school-guide-release.md`
- Risk impact (if any): Low-to-medium and isolated to new public read pages plus an explicitly submitted inquiry write. No database migration is added. Existing parent, employee, scheduling, attendance, package, payroll, finance, feedback, renewal and Ticket behavior is unchanged; the new miniapp pages are additive and preserve all 44 existing latest-branch pages.
- Verification: 8 school-guide tests, all 109 backend regression tests and all 268 repository tests passed; TypeScript, `git diff --check`, the 223-page production build and the 52-page miniapp release audit passed. Deployed as commit `463b680d1c0c397b96edf48a849b0c92087c48e1`; PM2 PID `1443604`, public route checks and catalog checks passed. WeChat development version `1.0.17` uploaded at 562,793 bytes.
- Rollback point: `fab321420da02cc59f3fadc20d0b9de1d210459e` (`2026-07-24-r284` documentation-aligned production lineage).

---

## 2026-07-24-r284

- Release ID: `2026-07-24-r284`
- Date/Time (Asia/Shanghai): `2026-07-24`
- Deployment status: `LIVE`
- Scope: update the package-ledger PDF to use the approved `GTI2.png` brand asset and identify the student responsible for each deduction or rollback, including shared-package and historical attendance-repair rows.
- Key files:
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `lib/package-ledger-detail.ts`
  - `public/GTI2.png`
  - `tests/package-ledger-detail.test.ts`
  - `docs/tasks/TASK-20260724-package-ledger-student-attribution.md`
- Risk impact (if any): Low and read-only. This changes only package-ledger PDF rendering and read-side student-name resolution. Package ownership, sharing, balances, transaction rows, attendance deductions, scheduling, invoices, receipts, payroll and partner settlement are unchanged.
- Verification: 5 focused package-ledger tests and all 260 repository tests passed; TypeScript, `git diff --check` and the 213-route production build passed. Runtime feature commit `b324c089be8eb11ddf1306ea26786a43423c3000` aligned locally, on GitHub and on the server with PM2 PID `99894` and `/admin/login` HTTP 200. The deployed `GTI2.png` SHA-256 matched the approved source asset and the server route contained the student-resolution helper and unresolved-row label.
- Rollback point: `539cc82715dd8c1d4af5dfd69409eae178fcd31f` (`2026-07-24-r283` documentation-aligned production lineage).

---

## 2026-07-24-r283

- Release ID: `2026-07-24-r283`
- Date/Time (Asia/Shanghai): `2026-07-24`
- Deployment status: `LIVE`
- Scope: simplify the admin Ticket workflow into request, action and advanced layers, and make web scheduling actions atomically update the exact linked Ticket action.
- Key files:
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
  - `docs/tasks/TASK-20260724-ticket-action-workflow.md`
- Risk impact (if any): Medium and limited to operator-triggered Ticket-linked scheduling. Existing standalone scheduling keeps its current behavior; finance, contracts, package balances, attendance deduction rules, receipts, payroll, partner settlement and miniapp scheduling paths are unchanged.
- Verification: 16 focused Ticket tests and all 257 repository tests passed; TypeScript, `git diff --check` and the 213-route production build passed. Runtime feature commit `c22e7f3d77c2d28f2ea282bc44a16693ecc4d1db` aligned locally, on GitHub and on the server with PM2 PID `90247` and `/admin/login` HTTP 200. All 112 database migrations remained current. Anonymous `/admin/tickets` access redirected to `/admin/login`, and a read-only production query confirmed three existing structured Tickets retained their unresolved action states without deployment-time writes.
- Rollback point: `f50f60f438dd81185430c584da2cb0a378a305c9` (`2026-07-23-r282` documentation-aligned production lineage).

---

## 2026-07-23-r282

- Release ID: `2026-07-23-r282`
- Date/Time (Asia/Shanghai): `2026-07-23`
- Deployment status: `LIVE`
- Scope: make shared-package course changes student-specific. Operators select one package-linked student, the source course and the new course; only that student's safe future one-to-one lessons are migrated, while the package remains one shared balance pool.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/api/admin/packages/[id]/route.ts`
  - `lib/package-course-transition.ts`
  - `tests/package-course-transition.test.ts`
  - `docs/tasks/TASK-20260723-shared-package-student-course-scope.md`
- Risk impact (if any): Medium and operator-triggered. Shared-package primary course, other shared students, completed/protected lessons, group sessions, balances, attendance deductions, contracts, invoices, receipts, payroll and partner settlement remain unchanged.
- Verification: TypeScript, 6 focused tests, 109 backend regression tests, `git diff --check` and the 213-route production build passed. Runtime feature commit `8a4ed640d17ca75e9dde0fc04fb429de7b306ccd` aligned locally, on GitHub and on the server with PM2 PID `4063677` and `/admin/login` HTTP 200. All 112 database migrations remained current; this release added no migration.
- Rollback point: `8fa1c15a35e4fb52c581b974eb79ffcdef5802cc` (`2026-07-23-r281` production lineage).

---

## 2026-07-23-r281

- Release ID: `2026-07-23-r281`
- Date/Time (Asia/Shanghai): `2026-07-23`
- Deployment status: `LIVE`
- Scope: add a controlled package-course transition that updates the package and safe future one-to-one sessions together, preserves completed lesson history, refreshes pending course reminders, and standardizes normal package suggestions at 15, 50 and 100 hours.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/api/admin/packages/[id]/route.ts`
  - `lib/package-course-transition.ts`
  - `lib/package-hour-presets.ts`
  - `lib/miniapp-notifications.ts`
  - `tests/package-course-transition.test.ts`
  - `docs/tasks/TASK-20260723-package-course-transition.md`
- Risk impact (if any): Medium and operator-triggered. The transaction changes the package primary course and eligible future one-to-one Session class links only. Completed lessons, sessions with attendance/feedback, shared group sessions, balances, deductions, contracts, invoices, receipts, payroll and partner settlement remain unchanged.
- Verification: TypeScript, 5 focused transition tests, 108 backend regression tests, `git diff --check` and the 213-route production build passed. Runtime feature commit `a654dd1d4cbe89677d59b1d047a917af7cbca0a6` aligned locally, on GitHub and on the server with PM2 PID `4053092` and `/admin/login` HTTP 200. All 112 database migrations remained current; this release added no migration.
- Rollback point: `662fa7c1ce00599a32e34556ffb1e9c8dbc1fec2` (`2026-07-23-r280` production lineage).

---

## 2026-07-23-r280

- Release ID: `2026-07-23-r280`
- Date/Time (Asia/Shanghai): `2026-07-23`
- Deployment status: `LIVE`
- Scope: remove implementation commentary, permission explanations and repeated queue guidance from the renewal workbench so web and employee miniapp show only the title, source queues, counts, risk, owner and next actions.
- Key files:
  - `app/admin/renewals/page.tsx`
  - `app/admin/renewals/RenewalWorkbenchClient.tsx`
  - `app/admin/renewals/renewals.module.css`
  - `miniapp/boss-academic-parent/pages/staff-renewals/*`
  - `tests/renewal-management.test.ts`
  - `docs/tasks/TASK-20260723-renewal-copy-cleanup.md`
- Risk impact (if any): Low and presentation-only. No renewal data, permissions, task status, evidence, package, scheduling, finance, payroll or partner-settlement behavior changes.
- Verification: TypeScript, 7 focused renewal tests, native miniapp JavaScript syntax, the 44-page miniapp release audit, `git diff --check`, explicit removed-copy search and the 213-route production build passed. Runtime feature commit `371f5471d995a438e70e640d1917f66f5a91d06a` aligned locally, on GitHub and on the server with PM2 PID `3996895` and `/admin/login` HTTP 200. WeChat development version `1.0.16` uploaded successfully at 529,892 bytes (517.5 KB); experience-version designation and physical-phone visual acceptance remain manual.
- Rollback point: `7b7cc546934cdc2dfc61529b5be6f4e80f3fdeb5` (`2026-07-23-r279` documentation-aligned production lineage).

---

## 2026-07-23-r279

- Release ID: `2026-07-23-r279`
- Date/Time (Asia/Shanghai): `2026-07-23`
- Deployment status: `LIVE`
- Scope: separate New Oriental students from Boss/other renewal work on web and employee miniapp, use the existing `新东方学生` source channel instead of name matching, and give the New Oriental queue partner-facing labels and WeChat copy.
- Key files:
  - `lib/renewal-management.ts`
  - `app/admin/renewals/*`
  - `app/api/admin/renewals/route.ts`
  - `app/api/miniapp/staff/renewals/route.ts`
  - `app/api/miniapp/staff/action-center/route.ts`
  - `app/api/miniapp/staff/health/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-renewals/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `tests/renewal-management.test.ts`
  - `docs/tasks/TASK-20260723-renewal-xdf-separation.md`
- Risk impact (if any): Low. This is a read/presentation split over the existing student source relation. It does not change student source assignments, renewal task statuses, package balances, sessions, attendance, contracts, invoices, receipts, payroll or partner settlement. Existing audit and evidence rules remain.
- Verification: production read-only inspection found 9 open New Oriental tasks and 11 open Boss/other tasks. Prisma generation, TypeScript, 15 focused tests, 103 backend regression tests, native miniapp JavaScript syntax, the 44-page miniapp release audit, `git diff --check` and the 213-route production build passed. Runtime feature commit `6700864719d5b16b2351f6f17ebe2adb36f0ab69` aligned locally, on GitHub and on the server with PM2 PID `3981337` and `/admin/login` HTTP 200. Production service queries returned exactly 11 Boss/other and 9 New Oriental tasks with zero cross-cohort rows; anonymous renewal access returned 401. A controlled sync updated all 9 New Oriental messages to the project-contact template without changing task status. WeChat development version `1.0.15` uploaded successfully at 530,450 bytes (518.0 KB); experience-version designation and physical-phone acceptance remain manual.
- Rollback point: `5748c44056024c9bb2264caccc56aec73fdb9e91` (`2026-07-23-r278` documentation-aligned production lineage).

---

## 2026-07-23-r278

- Release ID: `2026-07-23-r278`
- Date/Time (Asia/Shanghai): `2026-07-23`
- Deployment status: `LIVE`
- Scope: add a complete renewal follow-up center that forecasts package depletion, creates one auditable open task per package, guides Emily/Eva/Jasmine from parent contact through contract, payment and package activation, and fully excludes teachers from student balance and renewal information.
- Key files:
  - `prisma/migrations/20260723090000_add_renewal_followup_center/migration.sql`
  - `lib/renewal-management.ts`
  - `scripts/sync-renewal-tasks.ts`
  - `ops/server/scripts/setup_renewal_followup_cron.sh`
  - `app/admin/renewals/*`
  - `app/api/admin/renewals/*`
  - `app/api/miniapp/staff/renewals/*`
  - `miniapp/boss-academic-parent/pages/staff-renewals/*`
  - `tests/renewal-management.test.ts`
  - `docs/tasks/TASK-20260723-renewal-followup-center.md`
- Risk impact (if any): Medium. One additive workflow table is introduced and forecasts read existing packages, sessions and package transactions. The release does not change package balances, attendance deduction, scheduling, contracts, invoices, receipts, payroll or partner settlement. WeChat communication remains manual and requires screenshot evidence before the task can be marked as parent-notified.
- Verification: Prisma generation and TypeScript passed; 31 focused renewal/miniapp/communication tests and 100 backend regression tests passed; the production build completed with 213 routes. Runtime feature commit `c431f094dc65b83fa993d9feda1bce0dda6e34ea` aligned locally, on GitHub and on the server with PM2 PID `3971356` and `/admin/login` HTTP 200. Production reports all 112 migrations current. The first controlled sync created 20 open tasks: 8 `EXHAUSTED`, 4 `RED`, 8 `YELLOW`; 18 are `PENDING_CONTACT` and 2 are `PAYMENT_PENDING`. Anonymous renewal API access returned 401, and automated permission tests confirm teacher renewal and Student360 operational access is denied. WeChat development version `1.0.14` uploaded successfully at 527,564 bytes (515.2 KB); experience-version designation and physical-phone acceptance remain manual.
- Rollback point: `61a3e6edca833d8dce80c6f94646477a13c1080b` (`2026-07-20-r277` documentation-aligned production lineage).

---

## 2026-07-20-r277

- Release ID: `2026-07-20-r277`
- Date/Time (Asia/Shanghai): `2026-07-20`
- Deployment status: `LIVE`
- Scope: replace ambiguous generic course corrections with an auditable Course Change Resend workflow that identifies the actual change, compares previous and current arrangements, upgrades still-open historical generic tasks, gives explicit cancellation/no-replacement wording and requires WeChat evidence before completion.
- Key files:
  - `lib/parent-communication-center.ts`
  - `miniapp/boss-academic-parent/pages/staff-communications/*`
  - `app/admin/communications/CommunicationCenterClient.tsx`
  - `tests/parent-communication-center.test.ts`
  - `docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html`
  - `docs/SOP-小程序-管理-监督与账号-中英文培训版-20260718.html`
  - `docs/tasks/TASK-20260720-course-change-resend-clarity.md`
- Risk impact (if any): Medium-low. The change affects communication-task presentation and completion validation but does not alter Session, Ticket, attendance, package, finance, payroll or permission records. There is no migration. Staff must still send through WeChat manually.
- Verification: 96 backend regression tests (including 17 focused communication tests), TypeScript, `git diff --check`, the 43-page miniapp release audit and the 210-route production build passed. Three v1.0.13 bilingual SOP PDFs (54 pages total) passed text extraction and contact-sheet visual review. Runtime feature commit `95cbda72a7a84dd890a750d746edf620c71d578b` aligned locally, on GitHub and on the server with PM2 PID `2916026` and health 200. A production sync upgraded 1 historical generic task; Steven and 刘妍书 now show explicit cancellation/no-replacement, while Zack shows a real time change with previous/current blocks. WeChat development version `1.0.13` uploaded successfully at 513,286 bytes (501.3 KB); experience-version designation and physical-phone acceptance remain manual.
- Rollback point: `66a0059b66b57e8c52098a25ba5388c9f93d52b7` (`2026-07-20-r276` release lineage).

---

## 2026-07-20-r276

- Release ID: `2026-07-20-r276`
- Date/Time (Asia/Shanghai): `2026-07-20`
- Deployment status: `LIVE`
- Scope: deliver seven employee-miniapp usability upgrades: teacher homework/class attachments, contextual issue reporting, simplified role navigation, resilient drafts and retry, exact Mini Program card sharing, a manager health dashboard, and stronger read-side privacy auditing.
- Key files:
  - `prisma/migrations/20260720090000_add_session_feedback_attachments/migration.sql`
  - `app/api/miniapp/staff/schedule/[sessionId]/feedback/attachments/*`
  - `app/api/miniapp/students/[studentId]/feedbacks/[feedbackId]/attachments/[attachmentId]/route.ts`
  - `app/api/miniapp/staff/issues/route.ts`
  - `app/api/miniapp/staff/health/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-session-detail/*`
  - `miniapp/boss-academic-parent/pages/staff-communications/*`
  - `miniapp/boss-academic-parent/pages/staff-issue-report/*`
  - `miniapp/boss-academic-parent/pages/staff-health/*`
  - `tests/miniapp-resilience-share.test.ts`
  - `docs/tasks/TASK-20260720-miniapp-seven-usability-upgrades.md`
- Risk impact (if any): Medium-low. The release adds one isolated attachment table and authenticated endpoints. It does not rewrite existing teaching, scheduling, attendance, package, finance or payroll records. Direct card sharing still requires the employee to select a WeChat recipient and tap Send; evidence/confirmation remains a separate audited business step.
- Verification: 93 backend tests and 21 focused tests passed; native JavaScript syntax, Mini Program JSON, the 43-page release audit, Prisma generation, `git diff --check` and the full 210-route production build passed. Runtime feature commit `839a459d265037ebddda9ad4c2d4d539cac5b843` aligned locally, on GitHub and on the server with PM2 healthy and `/admin/login` HTTP 200. A direct production Prisma query confirmed the attachment table exists with zero rows, and anonymous health/attachment reads plus direct-server issue writes were rejected. WeChat development version `1.0.12` uploaded successfully at 508,918 bytes (497.0 KB); experience-version designation and physical-phone checks remain manual.
- Rollback point: `43d67a3` (`2026-07-19-r275` release lineage).

---

## 2026-07-19-r275

- Release ID: `2026-07-19-r275`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE`
- Scope: make teacher-feedback publication continue visibly into the required manual WeChat-group delivery workflow.
- Key files:
  - `miniapp/boss-academic-parent/pages/staff-communications/staff-communications.js`
  - `miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxml`
  - `miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxss`
  - `tests/parent-communication-center.test.ts`
  - `docs/tasks/TASK-20260719-feedback-wechat-handoff.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a staff-miniapp workflow presentation and post-publish navigation change; feedback review rules, parent-miniapp publication, manual-send audit writes, scheduling, attendance, package, finance and payroll logic are unchanged.
- Verification: 22 focused communication/action-centre tests, native JavaScript syntax, the 41-page miniapp audit and the 208-route production build passed. Runtime commit `93a042dd80a8b14bc04abd453072f3d614f01aa0` aligned locally, on GitHub and on the server with PM2 PID `2570983` and `/admin/login` HTTP 200. Anonymous communication reads and writes both returned 401. Read-only production inspection found 1 `PENDING_REVIEW` feedback task and 4 completed feedback tasks; no real feedback was changed. WeChat development version `1.0.11` uploaded successfully at 486,190 bytes (474.8 KB).
- Rollback point: `6eb9da9622d59989f8d13cc68ef650429e0ea73a` (`2026-07-19-r274`).

---

## 2026-07-19-r274

- Release ID: `2026-07-19-r274`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE`
- Scope: align the employee action-centre Ticket count with an all-source Ticket list and make each Ticket source explicit in the miniapp.
- Key files:
  - `app/api/miniapp/staff/parent-requests/route.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/route.ts`
  - `app/api/miniapp/staff/parent-requests/[id]/attachments/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-requests/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `docs/tasks/TASK-20260719-miniapp-unified-ticket-scope.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. Employee reads now include all Ticket sources only when the authenticated staff page explicitly requests `scope=all`; parent-facing reads, Ticket creation defaults, scheduling, attendance, package, finance and payroll logic are unchanged.
- Verification: 28 focused miniapp/Ticket tests, the 41-page miniapp audit and the 208-route production build passed. Runtime commit `ec0716ad5b9ef4c3fae7805eac9e9be3be6ec453` aligned locally, on GitHub and on the server with PM2 PID `2544876` and `/admin/login` HTTP 200. Both unauthenticated staff-list variants returned 401. Read-only production inspection confirmed the action-centre and unified-list open counts both equal 8, comprising 7 `自营学生` Tickets and 1 `家长小程序` Ticket. WeChat development version `1.0.10` uploaded successfully at 484,435 bytes (473.1 KB).
- Rollback point: `b85577a849bd79b7b0fc930cca28db87c8e1b878` (`2026-07-19-r273` release lineage).

---

## 2026-07-19-r273

- Release ID: `2026-07-19-r273`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE`
- Scope: make reminder presentation changes compare real course lines and prevent internal synchronization flags from entering Prisma writes.
- Key files:
  - `lib/parent-communication-center.ts`
  - `tests/parent-communication-center.test.ts`
  - `docs/tasks/TASK-20260719-reminder-presentation-sync-guard.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low roll-forward for an active sync failure. No false correction was inserted; one completed reminder received an accidental `supersededAt` timestamp and will be repaired after deploy only under an exact no-correction precondition.
- Verification: 13 focused communication tests, all 222 repository tests, TypeScript and the 208-route production build passed. Runtime commit `67e6adde72d79a3e3ecb66b4dc6e6f85b7ceb018` aligned locally, on GitHub and on the server with PM2 PID `2516152` and `/admin/login` HTTP 200. Exact conditional repair cleared the one accidental `supersededAt` only after confirming zero correction children. The subsequent production sync completed for 20 reminders: 12/12 parent reminders contained the parent-miniapp instruction, 8/8 teacher reminders contained employee-miniapp plus teacher-web access, correction count remained zero and no reminder retained a superseded timestamp. `/teacher` returned the expected authentication redirect (HTTP 307).
- Rollback point: `921f2f5913ced880a734cfd5ee97228e851b6988` (`2026-07-19-r271`) if both r272 and r273 must be removed.

---

## 2026-07-19-r272

- Release ID: `2026-07-19-r272`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE WITH r273 GUARD`
- Scope: align course-reminder images with the “博思学业管家” brand and add the existing teacher web schedule as an alternative to the employee miniapp.
- Key files:
  - `lib/communication-share-image.ts`
  - `lib/parent-communication-center.ts`
  - `app/admin/communications/CommunicationCenterClient.tsx`
  - `tests/parent-communication-center.test.ts`
  - `docs/tasks/TASK-20260719-reminder-brand-and-web-entry.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. Reminder presentation and one existing web link change; no schedule, attendance, package, finance, payroll, notification timing, recipient or permission logic changes. Parents/students remain on the authenticated parent miniapp because no parent web portal exists.
- Verification: 12 focused tests, all 221 repository tests, TypeScript, the 41-page miniapp audit and the 208-route production build passed. Parent and teacher share images passed visual inspection with the Chinese brand, absolute date and role-correct access paths.
- Rollback point: `921f2f5913ced880a734cfd5ee97228e851b6988` (`2026-07-19-r271`).

---

## 2026-07-19-r271

- Release ID: `2026-07-19-r271`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE`
- Scope: make communication tasks date-explicit and separated by workflow, make feedback review visibly complete, and make staff-uploaded Ticket attachments viewable through an authenticated audited miniapp flow.
- Production-data compatibility: teacher names that already include the “老师” suffix are normalized so the generated salutation and miniapp recipient label do not duplicate the honorific.
- Key files:
  - `lib/parent-communication-center.ts`
  - `app/admin/communications/CommunicationCenterClient.tsx`
  - `app/api/miniapp/staff/parent-requests/[id]/attachments/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-communications/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `docs/tasks/TASK-20260719-communication-workbench-completeness.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium-low. Reminder presentation, workflow navigation, feedback publication completeness and staff attachment reads change; Session, attendance, finance, payroll, package, scheduling actions and historical records remain unchanged.
- Verification: TypeScript, native miniapp JavaScript, focused regressions, all 220 repository tests, the 41-page miniapp audit and the 208-route production build passed. Runtime feature commit `612ac05789a5c9d60c9250e709647ee11dcfe977` was aligned locally, on GitHub and on the server with PM2 PID `2478563` and `/admin/login` HTTP 200. A controlled sync produced 20/20 date-explicit real reminders, 0 duplicate “老师老师” salutations and 0 false correction tasks. Unauthenticated employee communication, Ticket detail and Ticket attachment routes each returned 401. WeChat development version `1.0.9` uploaded successfully at 483,043 bytes (471.7 KB), and parent/teacher share images were visually inspected with readable Chinese, absolute dates and audience-correct footers.
- Rollback point: `e76abc1c47d4d391d0eb0b36aa99b197e5697916` (`2026-07-19-r270`).

---

## 2026-07-19-r270

- Release ID: `2026-07-19-r270`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE`
- Scope: fix parent reminder share images so production renders Chinese text with a verified Noto CJK font and wraps mixed Chinese/English copy without splitting words.
- Key files:
  - `lib/communication-share-image.ts`
  - `ops/server/scripts/deploy_app.sh`
  - `tests/parent-communication-center.test.ts`
  - `docs/tasks/TASK-20260719-communication-image-cjk-font.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes PNG rendering and conditionally installs an open-source CJK font on the production host. Reminder content, recipients, notifications and all business records remain unchanged.
- Verification: root cause confirmed by production having no `:lang=zh` font; 7 focused tests, deployment-shell syntax, TypeScript, all 86 backend regression tests and the 208-route production build passed. Production now matches `Noto Sans CJK SC`; a real `COURSE_REMINDER_PARENT` record (`Andrew · 明日家长群课程提醒`) generated a visually verified 1080×1440 PNG with readable Chinese and intact English words. Runtime feature commit `5aa3627`, PM2 PID `2400607`, `/admin/login` HTTP 200.
- Rollback point: `79d8deec7ef793ea96846988004b0bf813ddb358` (`2026-07-19-r269`).

---

## 2026-07-19-r269

- Release ID: `2026-07-19-r269`
- Date/Time (Asia/Shanghai): `2026-07-19`
- Deployment status: `LIVE` at runtime feature commit `72e6695fa74ef38f3be0080adcf467e1bacbeaaf`
- Scope: add six role-aware employee-miniapp workspaces for unified actions, Student 360, operation correction, management approvals, new-lead intake and Teacher communications/reports.
- Key files:
  - `app/api/miniapp/staff/action-center/*`
  - `app/api/miniapp/staff/students/[studentId]/workspace/*`
  - `app/api/miniapp/staff/operations/*`
  - `app/api/miniapp/staff/approvals/*`
  - `app/api/miniapp/staff/leads/*`
  - `app/api/miniapp/staff/teacher/reports/*`
  - `miniapp/boss-academic-parent/pages/staff-{action-center,student-workspace,operations,approvals,leads,teacher-reports}/*`
  - `tests/miniapp-action-center.test.ts`
  - `docs/tasks/TASK-20260719-miniapp-action-center.md`
- Risk impact (if any): Medium-low. This adds authenticated employee-miniapp APIs and native pages with no schema migration. Approval writes reuse existing guarded services; scheduling and corrections create Tickets instead of directly changing Sessions. No existing web UI, attendance deduction, package balance, finance calculation, payroll calculation or settlement rule changes.
- Verification: 34 focused tests, all 84 backend regression tests, native JavaScript syntax, WXML compatibility scan, TypeScript, the 208-page production build, the 41-page mini-program release audit, Management/Teacher read-only API smoke tests, guarded invalid-write checks and a 463.5 KB WeChat Developer Tools preview passed. The guarded release aligned runtime at `72e6695`, applied no new migration, started PM2 PID `2389459` and returned `/admin/login` HTTP `200`. All nine post-deploy Management/Teacher read-only endpoint checks returned `200`, temporary sessions remaining were zero, and WeChat development version `1.0.8` uploaded successfully at 463.5 KB.
- Rollback point: `eec567f` (`2026-07-18-r268` documentation head; application runtime remains the r267 feature set).

---

## 2026-07-18-r268

- Release ID: `2026-07-18-r268`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` (documentation-only release; application runtime remains the r267 feature set)
- Scope: add three detailed bilingual WeChat-mini-program SOPs for Teacher, Academic Operations and Management, using real iPhone 12/13 DevTools screenshots and red callouts.
- Key files:
  - `docs/SOP-小程序-老师-完整操作-中英文培训版-20260718.html`
  - `docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html`
  - `docs/SOP-小程序-管理-监督与账号-中英文培训版-20260718.html`
  - `docs/assets/sop-小程序员工工作台-20260718/*`
  - `output/pdf/SOP-小程序-*-20260718.pdf`
  - `docs/tasks/TASK-20260718-miniapp-bilingual-sops.md`
- Risk impact (if any): Documentation-only. No API, database, permission, scheduling, attendance, package, finance, payroll, notification or miniapp source behavior changes.
- Verification: WeChat DevTools automated capture completed with temporary CS, ADMIN and TEACHER identities; all temporary users/sessions were removed. PDF render and text extraction passed for Teacher 14 pages, Academic Operations 18 pages and Management 14 pages. Contact-sheet visual review found no blank, clipped or overflow pages.
- Rollback point: `7e4d3e1` (r267 final feature and web-SOP documentation head).

---

## 2026-07-18-r267

- Release ID: `2026-07-18-r267`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` at commit `474e40c526f4118941553fd844dfe756b8c9e756`
- Scope: add one shared Emily/Eva parent-communication center that separates feedback review, parent-miniapp publication, automatic notification and manual WeChat-group forwarding, with correction tasks and complete audit history.
- Key files:
  - `prisma/schema.prisma`
  - `lib/parent-communication-center.ts`
  - `app/admin/communications/*`
  - `app/api/admin/communications/*`
  - `app/api/miniapp/staff/communications/*`
  - `miniapp/boss-academic-parent/pages/staff-communications/*`
  - `scripts/queue-miniapp-course-reminders.ts`
  - `scripts/sync-parent-communication-tasks.ts`
  - `tests/parent-communication-center.test.ts`
  - `docs/tasks/TASK-20260718-parent-communication-center.md`
  - `docs/SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.html`
  - `docs/SOP-教务-家长沟通与通知中心-中英文培训版-20260718.html`
  - `docs/SOP-管理-家长沟通通知监督与审计-中英文培训版-20260718.html`
- Risk impact (if any): Medium. One additive communication-task table and nullable review/group metadata are added. Existing feedbacks are backfilled as already published so no historical parent record disappears. New teacher feedback waits for Emily/Eva review before parent visibility or notification. Stale course notifications are invalidated after cancellation/rescheduling. No Session time, attendance deduction, package balance, finance, payroll or settlement write rule changes.
- Verification: Prisma validation, TypeScript, 8 focused tests, all 84 backend tests, 35-page miniapp release audit, native miniapp JavaScript and cron shell syntax, and the full 203-page production build passed. The standard release aligned local/GitHub/server at `474e40c`, applied all 110 migrations, started PM2 PID `2163400`, installed exactly one expanded five-minute reminder cron, and returned HTTP `200` from `/admin/login`. WeChat development version `1.0.7` uploaded successfully at 416.7 KB. Playwright production capture plus PDF text/render validation passed for the 13-page Teacher, 17-page Academic Operations, and 14-page Management bilingual SOPs.
- Rollback point: `ee9f658` (`2026-07-18-r266` final production documentation head; runtime feature commit `f7c78bb`).

---

## 2026-07-18-r266

- Release ID: `2026-07-18-r266`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` at runtime feature commit `f7c78bb`
- Scope: finish the scheduling-work-order rollout by making the existing web intake link a guided multi-action form and adding automatic audit rows for every authenticated miniapp mutation and upload.
- Key files:
  - `app/tickets/intake/GuidedIntakeForm.tsx`
  - `app/tickets/intake/IntakeForm.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/api/tickets/intake/[token]/sessions/lookup/route.ts`
  - `app/api/miniapp/operation-log/route.ts`
  - `miniapp/boss-academic-parent/utils/api.js`
  - `lib/ticket-scheduling-actions.ts`
  - `tests/ticket-scheduling-actions.test.ts`
  - `tests/miniapp-operation-audit.test.ts`
  - `docs/tasks/TASK-20260718-guided-intake-miniapp-audit.md`
- Risk impact (if any): Medium-low. The public token link now defaults to guided scheduling intake but retains the complete legacy form for non-scheduling work. Structured writes validate that every source lesson belongs to the selected student and do not bypass existing schedule execution gates. Miniapp operation logs reuse the existing AuditLog table, skip GET reads, redact authentication/signature fields and never block the original request. No schema, attendance, package, finance, payroll or settlement logic changes.
- Verification: 8 focused tests, 64 miniapp/WeChat/scheduling tests, 79 backend tests, all native JavaScript syntax, 34-page miniapp audit, TypeScript, `git diff --check`, and the full 200-page production build pass. Production is aligned at runtime feature commit `f7c78bb`; 109 migrations are current with none pending, PM2 is online at PID `2145519`, `/admin/login` returns `200`, an existing active intake token renders the guided title, invalid-token session lookup returns `403`, unauthenticated operation logging returns `401`, and read-only action count remains zero. WeChat development version `1.0.6` uploaded successfully at 403.0 KB.
- Rollback point: `851eb11` (`2026-07-18-r265` final production documentation head; runtime feature commit `421b4e7`).

---

## 2026-07-18-r265

- Release ID: `2026-07-18-r265`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` at runtime feature commit `421b4e7`
- Scope: connect scheduling Tickets to exact source/result Sessions through multi-action work orders shared by Emily's miniapp intake and the web scheduling operations desk.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260718143000_add_ticket_scheduling_actions/migration.sql`
  - `lib/ticket-scheduling-actions.ts`
  - `lib/ticket-scheduling-action-write.ts`
  - `app/admin/tickets/scheduling/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/api/miniapp/staff/parent-requests/route.ts`
  - `app/api/miniapp/staff/scheduling-coordination/[ticketId]/actions/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-request-new/*`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/*`
  - `tests/ticket-scheduling-actions.test.ts`
  - `docs/tasks/TASK-20260718-ticket-scheduling-work-orders.md`
- Risk impact (if any): Medium. One additive work-order table and transactional action-result writes are added around the existing scheduling flows. Existing Ticket/Session meanings and all Attendance, package, finance, payroll and settlement columns are unchanged. Legacy Tickets remain valid without backfill. Formal schedule writes stay ADMIN-only and continue through the existing preview, qualification, availability, package/finance and conflict gates.
- Verification: 5 focused scheduling-action tests, 56 miniapp/WeChat tests, 79 backend tests, all native JavaScript syntax, 34-page miniapp audit, Prisma validation, TypeScript, `git diff --check`, and the full 199-page production build pass. Production is aligned at runtime feature commit `421b4e7`; 109 migrations are current with none pending, the new table has all 6 expected indexes and zero synthetic/backfilled rows, PM2 is online at PID `2133958`, `/admin/login` returns `200`, and the unauthenticated scheduling-action write returns `401`. WeChat development version `1.0.5` uploaded successfully at 401.3 KB.
- Rollback point: `6f1e602` (`2026-07-18-r264` final production documentation head; runtime feature commit `21310b2`).

---

## 2026-07-18-r264

- Release ID: `2026-07-18-r264`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` at runtime feature commit `21310b2`
- Scope: make Emily's staff-assisted Ticket intake unmistakable and three-step simple, while reserving sensitive, non-owned and reassignment closure authority for management.
- Key files:
  - `app/api/miniapp/staff/parent-requests/[id]/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-request-new/*`
  - `miniapp/boss-academic-parent/pages/staff-request-detail/*`
  - `tests/miniapp-emily-request-intake.test.ts`
  - `docs/tasks/TASK-20260718-miniapp-emily-request-intake.md`
- Risk impact (if any): Medium-low and limited to native employee-miniapp presentation plus narrower parent-request completion/reassignment authorization. ADMIN retains full authority. CS can complete only a low-risk Ticket assigned to the current user's exact display name; complaints, finance issues, school affairs, non-owned Tickets and all post-creation reassignment require ADMIN. No web page, migration, Ticket creation schema, parent visibility, notification, scheduling, attendance, package, finance calculation or payroll behavior changes.
- Verification: 3 focused tests, all 49 miniapp tests, all 79 backend tests, TypeScript, native JavaScript syntax, the full 198-page production build, `git diff --check`, the no-`app/admin/**` diff check and a 388.1 KB WeChat Developer Tools preview pass. Production is aligned at runtime feature commit `21310b2`; 108 migrations are current with none pending, PM2 is online at PID `2109211`, `/admin/login` returns `200`, and anonymous request-detail access returns `401`. WeChat development version `1.0.4` uploaded successfully at 388.1 KB.
- Rollback point: `13a05d2` (`2026-07-18-r263` final production documentation head; runtime feature commit `e0cdecb`).

---

## 2026-07-18-r263

- Release ID: `2026-07-18-r263`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` at runtime feature commit `e0cdecb`
- Scope: complete the teacher daily miniapp workspace with published-payroll acknowledgement, taught-student cross-teacher feedback history, unified teacher todos and explicit photo-album/WeChat-file Ticket attachments.
- Key files:
  - `app/api/miniapp/staff/teacher/payroll/route.ts`
  - `app/api/miniapp/staff/teacher/student-feedbacks/route.ts`
  - `app/api/miniapp/staff/teacher/todos/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-teacher-*/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/staff-request-new/*`
  - `tests/miniapp-teacher-daily-workspace.test.ts`
  - `docs/tasks/TASK-20260718-miniapp-teacher-daily-workspace.md`
- Risk impact (if any): Medium and restricted to the native employee miniapp plus teacher-scoped APIs. Payroll confirmation is allowed only for the logged-in teacher's existing published payroll and reuses the audited confirmation service. Feedback history is limited to students established by real teaching records. No `app/admin/**` page, migration, payroll calculation, approval rule, scheduling, attendance deduction, package, finance or parent permission changes.
- Verification: TypeScript, 5 focused tests, all 46 miniapp tests, all 79 backend tests, the full 198-page production build, native JavaScript syntax, `git diff --check`, the no-`app/admin/**` diff check and a 378.9 KB WeChat Developer Tools preview pass. Read-only production inspection confirms Jasmine has 39 taught students and 1,136 visible historical feedbacks; July payroll is not published and therefore correctly remains unavailable without a confirm action. The guarded production release aligned runtime at `e0cdecb`; 108 migrations are current with none pending, PM2 is online at PID `2086282`, `/admin/login` returns `200`, and all three new teacher endpoints return `401` without a session. WeChat development version `1.0.3` uploaded successfully at 378.9 KB.
- Rollback point: `193000f` (`2026-07-18-r262` final production documentation head; runtime feature commit `960457f`).

---

## 2026-07-18-r262

- Release ID: `2026-07-18-r262`
- Date/Time (Asia/Shanghai): `2026-07-18`
- Deployment status: `LIVE` at runtime feature commit `960457f`
- Scope: allow one WeChat identity to bind and safely switch between multiple existing employee accounts, preserving separate ADMIN/TEACHER permissions and audit ownership.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260718090000_add_staff_miniapp_multi_account/migration.sql`
  - `lib/miniapp-staff.ts`
  - `app/api/miniapp/staff/auth/*`
  - `app/api/miniapp/staff/accounts/route.ts`
  - `miniapp/boss-academic-parent/pages/staff-login/*`
  - `miniapp/boss-academic-parent/pages/staff-account-switch/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `tests/miniapp-staff-multi-account.test.ts`
  - `docs/tasks/TASK-20260718-miniapp-staff-multi-account.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium and limited to employee-miniapp identity/session handling. The additive nullable session column and replacement of the single-openId unique index with a composite openId/user unique index preserve existing bindings. Account selection is allowed only among active bindings carrying the current session's verified WeChat OpenID. Web passwords, web login, employee roles, teacher links, scheduling, attendance, package balances, finance, payroll and parent access remain unchanged.
- Verification: read-only production inspection confirms Jasmine has separate ADMIN and TEACHER users, the TEACHER user has a linked teacher profile and one active miniapp binding, and the ADMIN user remains unbound. Prisma generation/validation, TypeScript, 4 focused multi-account tests, all 41 miniapp tests, all 79 backend tests, the full 195-page production build, `git diff --check` and WeChat Developer Tools preview pass. The guarded release aligned runtime at `960457f`; migration `20260718090000_add_staff_miniapp_multi_account` is complete, the nullable session OpenID column and composite binding indexes are present, PM2 is online at PID `2073081`, `/admin/login` returns `200`, and anonymous account-list access returns `401`. WeChat development version `1.0.2` uploaded successfully at 355.4 KB.
- Rollback point: `65148be` documentation head for live runtime feature commit `e4edbb4` (`2026-07-17-r261`).

---

## 2026-07-17-r261

- Release ID: `2026-07-17-r261`
- Date/Time (Asia/Shanghai): `2026-07-17`
- Deployment status: `LIVE` at runtime feature commit `e4edbb4`
- Scope: establish the native-miniapp UI foundation and redesign the parent/employee entry experience into role-aware management, academic, teacher and parent workspaces.
- Key files:
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/app.wxss`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `miniapp/boss-academic-parent/pages/home/*`
  - `tests/miniapp-role-home-ui.test.ts`
  - `docs/小程序UI设计规范与改造计划-20260717.md`
  - `docs/tasks/TASK-20260717-miniapp-role-home-ui.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low-to-medium and presentation-only in the native miniapp. No `app/admin/**`, API, database, permission or business write changed. Shared native styles affect all 30 pages, so representative physical-phone checks remain required before formal review.
- Verification: all native-miniapp JavaScript syntax, 44 miniapp/WeChat tests, 79 backend tests, the 30-page release audit, TypeScript, the full 194-page production build, `git diff --check`, explicit no-`app/admin/**` diff check and WeChat Developer Tools preview pass. The guarded release aligned local, GitHub and server at runtime feature commit `e4edbb4`; production has 107 current migrations, PM2 PID `1721052` is online and `/admin/login` returns `200`. WeChat development version `1.0.1` uploaded successfully for AppID `wxe7017f8545e8ad49`, package size 345.8 KB. Experience-version designation and physical-phone role checks remain before formal review.
- Rollback point: `d0bc927` (`2026-07-17-r260` final production documentation head; runtime feature commit `d919074`).

---

## 2026-07-17-r260

- Release ID: `2026-07-17-r260`
- Date/Time (Asia/Shanghai): `2026-07-17`
- Deployment status: `LIVE` at runtime feature commit `d919074`
- Scope: integrate the existing scheduling Ticket queue into the native staff-miniapp calendar workspace with status/owner/search filters, overdue visibility and deep links to the existing guarded scheduling detail.
- Key files:
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `tests/miniapp-staff-schedule-calendar.test.ts`
  - `docs/tasks/TASK-20260717-miniapp-calendar-ticket-queue.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low-to-medium and limited to native-miniapp presentation/read orchestration. No `app/admin/**` page, web workflow, API, migration or business write changed. The calendar remains read-only; Session creation still uses the existing ADMIN-only signed preview and transactional revalidation. Time-change, teacher-change and leave/cancellation Tickets are labelled as needing an original-Session link and are not executed from the calendar in phase one.
- Verification: all native-miniapp JavaScript syntax, 5 focused calendar tests, 41 complete miniapp/subscription tests, 79 backend tests, the 30-page miniapp release audit, TypeScript, the full 194-page production build, `git diff --check` and an explicit no-`app/admin/**` diff check pass. The guarded release aligned local, GitHub and server at `d919074`; production has 107 current migrations, PM2 is online and `/admin/login` returns `200`. Deployed source markers pass, anonymous calendar/queue calls return `401`, and a read-only production count reports 6 open scheduling Tickets, all 6 overdue. WeChat Developer Tools CLI uploaded version `1.0.0` successfully for AppID `wxe7017f8545e8ad49` with a 335.2 KB package; the WeChat portal experience-version designation and physical-phone confirmation remain.
- Rollback point: `1832181` documentation head for live runtime `931edbd` (`2026-07-17-r259`).

---

## 2026-07-17-r259

- Release ID: `2026-07-17-r259`
- Date/Time (Asia/Shanghai): `2026-07-17`
- Deployment status: `LIVE` at runtime commit `931edbd`
- Scope: redesign the native parent miniapp as a permission-aware reassurance dashboard, making Service a primary tab and prioritising status, delivered work, next steps, parent actions and reviewed Full Care reports.
- Key files:
  - `miniapp/boss-academic-parent/app.json`
  - `miniapp/boss-academic-parent/pages/home/*`
  - `miniapp/boss-academic-parent/pages/progress/*`
  - `miniapp/boss-academic-parent/pages/care-reports/*`
  - `miniapp/boss-academic-parent/pages/care-report-detail/*`
  - `app/api/miniapp/students/[studentId]/home/route.ts`
  - `app/api/miniapp/students/[studentId]/service-progress/route.ts`
  - `docs/小程序产品规划-家长安心看板-20260717.md`
  - `docs/tasks/TASK-20260717-miniapp-parent-reassurance-dashboard.md`
- Risk impact (if any): Low-to-medium presentation and read-projection change. There is no migration and no new business write. Existing relationship permissions separately gate schedule, feedback, finance, requests and reports. Care drafts, internal notes and unauthorised university reports remain excluded. Scheduling, attendance, packages, payroll, settlement, invoices and receipts are unchanged.
- Verification: all native miniapp JavaScript syntax, the 30-page release audit, 12 focused tests, 40 complete miniapp/subscription tests, 79 backend tests, TypeScript, the full 194-page build and `git diff --check` pass. Multi-student stale responses are discarded and the page clears before each student load. The acknowledgement relation projection also passes a read-only production-schema query. The guarded release aligned runtime at `931edbd`; production has 107 completed migrations with none pending, PM2 is online with zero restarts and `/admin/login` returns `200`. WeChat Developer Tools is not installed in the current runtime, so experience-version upload and physical-phone visual confirmation remain a rollout gate.
- Rollback point: `02dfa63` (`2026-07-17-r258` final documentation head; runtime feature commit `21ece37`).

---

## 2026-07-17-r258

- Release ID: `2026-07-17-r258`
- Date/Time (Asia/Shanghai): `2026-07-17`
- Deployment status: `LIVE` at runtime commit `21ece37`
- Scope: restore the complete role-appropriate admin sidebar inside Full Care pages while preserving the redesigned Care workspace and its local module navigation.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/SOP-教务-全托管完整操作流程-培训版-20260717.html`
  - `docs/assets/sop-教务-全托管完整V1-20260717/*`
  - `docs/tasks/TASK-20260717-care-full-sidebar-and-sop-refresh.md`
- Risk impact (if any): Low and navigation-only. Admin users regain the normal complete admin menu; Finance and resource-only users continue to receive their role-specific menus. No route permission, CARE action, database, teaching, package, payroll, settlement, invoice or receipt behavior changes.
- Verification: TypeScript, all 79 backend tests, the complete 194-page build and `git diff --check` pass. The guarded release aligned runtime at `21ece37`, production has 107 completed migrations with none pending, PM2 is online with zero restarts and `/admin/login` returns `200`. Authenticated production screenshots confirm the complete Admin sidebar and active Full Care item. The refreshed SOP uses real production desktop/mobile screenshots and calibrated red callouts; its 22 A4 landscape pages, 2.5 MB file, 6,024 extracted characters, key workflow terms and contact sheet all pass. Temporary student, engagement, parent and session residue is zero.
- Rollback point: `2fb0a1f` (`2026-07-17-r257` final documentation head; runtime feature commit `c26f725`).

---

## 2026-07-17-r257

- Release ID: `2026-07-17-r257`
- Date/Time (Asia/Shanghai): `2026-07-17`
- Deployment status: `LIVE` at runtime commit `c26f725`
- Scope: redesign the Full Care management UI as a compact professional operations workspace, with clearer module navigation, action priority, project hierarchy, report workflow and mobile behavior while preserving all existing Full Care business rules.
- Key files:
  - `app/admin/care/care.module.css`
  - `app/admin/care/page.tsx`
  - `app/admin/care/quality/page.tsx`
  - `app/admin/care/[id]/page.tsx`
  - `app/admin/care/[id]/operations/page.tsx`
  - `app/admin/care/[id]/reports/[reportId]/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `app/responsive-layout.css`
  - `docs/tasks/TASK-20260717-care-ui-workspace-redesign.md`
- Risk impact (if any): Low and presentation-only. There is no database migration and no change to CARE APIs, permissions, state transitions, parent visibility, teaching, packages, payroll, partner settlement, invoices or receipts. Existing forms continue to call their original Server Actions.
- Verification: TypeScript, all 79 backend tests, the full 194-page production build and `git diff --check` pass. The guarded release aligned local, GitHub and server at `c26f725`; production has 107 completed migrations with none pending, PM2 is online with zero restarts, and `/admin/login` returns `200`. Authenticated production checks cover the care home, quality dashboard, project, operations and report pages at desktop and 390px mobile; all ten requests returned `200`, all mobile document/client widths were `390/390`, and there were no application console errors or horizontal overflow. All temporary QA records and sessions were removed with zero residue.
- Rollback point: `4a29b7b` documentation head for live runtime `4885bab` (`2026-07-16-r256`).

---

## 2026-07-16-r256

- Release ID: `2026-07-16-r256`
- Date/Time (Asia/Shanghai): `2026-07-16`
- Deployment status: `LIVE` at runtime commit `4885bab`
- Scope: complete the pre-university-first Full Care V1 before operators configure students one by one, adding a quality dashboard, risk-response SLA, backup coverage and handover, parent report Q&A, and reviewed service-value/continuation records.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260716150000_add_care_operating_controls/migration.sql`
  - `lib/care-operations.ts`
  - `app/admin/care/quality/page.tsx`
  - `app/admin/care/[id]/operations/page.tsx`
  - `app/admin/care/[id]/reports/[reportId]/page.tsx`
  - `app/api/miniapp/students/[studentId]/care-reports/[reportId]/questions/*`
  - `miniapp/boss-academic-parent/pages/care-report-detail/*`
  - `docs/tasks/TASK-20260716-care-complete-v1.md`
- Risk impact (if any): Medium and isolated to CARE operations. The additive migration creates four new control tables and supporting enums; it does not alter Student, Session, Attendance, CoursePackage, PackageTxn, PartnerSettlement, Invoice, Receipt or payroll tables. Existing care projects and real students are not automatically changed. Parent questions require an existing published report and `canViewReports`; internal notes, risk facts and commercial notes are not serialized to parent APIs.
- Verification: Prisma validation/generation, TypeScript, all 79 backend tests, migration safety, the 30-page miniapp release audit, the full 194-page production build and `git diff --check` pass. Production has 107 completed migrations; local, GitHub and server are aligned at `4885bab`; PM2 is online with zero restarts and `/admin/login` returns `200`. Authenticated desktop and 390px mobile checks passed the care home, quality dashboard, project, report and operations pages without application errors or horizontal overflow. Parent report/question APIs passed anonymous `401`, authorized report/question/answer/closure `200`, and internal-note exclusion. The detailed SOP rendered as 22 populated landscape pages with verified text and contact-sheet review. Temporary student, parent, care records and both session types were cleaned to zero.
- Rollback point: `ca50f71` documentation head for previous live runtime `d926d5d` (`2026-07-16-r255`).

---

## 2026-07-16-r255

- Release ID: `2026-07-16-r255`
- Date/Time (Asia/Shanghai): `2026-07-16`
- Deployment status: `LIVE` at runtime commit `d926d5d`
- Scope: add an isolated formal progress-report workflow for care projects, with evidence-backed drafts, review/approval/publication locking, parent PDF access and parent acknowledgement.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260716090000_add_care_formal_reports/migration.sql`
  - `lib/care-reports.ts`
  - `lib/care-report-validation.ts`
  - `lib/care-report-pdf.ts`
  - `lib/parent-care-reports.ts`
  - `app/admin/care/[id]/*`
  - `app/api/admin/care/reports/[reportId]/pdf/route.ts`
  - `app/api/miniapp/students/[studentId]/care-reports/*`
  - `miniapp/boss-academic-parent/pages/care-reports/*`
  - `miniapp/boss-academic-parent/pages/care-report-detail/*`
- Risk impact (if any): Medium and isolated to CARE reports. The additive migration creates only report-related enums and four new tables. It does not alter existing Student, Session, Attendance, CoursePackage, PackageTxn, Invoice, Receipt, payroll, Partner or PartnerSettlement data. Reports require a legal state transition, optimistic version match and source evidence; only approved reports can be published, and parents can read only published reports through their existing `canViewReports` permission. University-stage parent access additionally requires adult-student consent for `formal_reports`. Internal notes are excluded from parent APIs and PDFs.
- Verification: Prisma schema validation/generation, TypeScript, all 73 backend tests, seven focused report/migration tests, all miniapp JavaScript syntax checks, the 30-page miniapp release audit, the full 193-page production build and `git diff --check` pass. Production has 106 completed migrations and all four report tables. Authenticated production checks passed the admin report workspace, parent list/detail, PDF and acknowledgement; anonymous access returned `401`, internal notes were absent, and the final PDF rendered as two populated A4 pages with correct `1/2` and `2/2` footers. All temporary QA data and audit records were removed.
- Rollback point: `2cafb48` (`2026-07-16-r254` guarded release head); final feature commit is `d926d5d`.

---

## 2026-07-16-r254

- Release ID: `2026-07-16-r254`
- Date/Time (Asia/Shanghai): `2026-07-16`
- Deployment status: `LIVE at this release commit after guarded workflow verification`
- Scope: make GitHub SSH 443 push, remote-commit verification, standard server deployment, and post-deploy version/health checks one guarded release command so a local commit cannot be mistaken for a completed server release.
- Key files:
  - `ops/server/scripts/release_to_server.sh`
  - `ops/server/scripts/quick_deploy.sh`
  - `docs/SERVER-HANDOFF.md`
  - `docs/CODEX-生产发布指挥模板.md`
  - `docs/tasks/TASK-20260716-guarded-git-server-release.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low and operational only. No application code, database schema, finance data, scheduling, attendance, packages, payroll, receipts, or server environment values change. The release command stops before push/deploy when tracked changes exist, GitHub SSH 443 is unavailable, release docs are missing, or the remote branch is not an ancestor of local HEAD.
- Verification:
  - `bash -n ops/server/scripts/release_to_server.sh ops/server/scripts/quick_deploy.sh`
  - `bash ops/server/scripts/release_to_server.sh --check`
  - the same script performs the real GitHub push and server deploy, then verifies local/GitHub/server commit equality, PM2 PID, and `/admin/login` HTTP 200
- Rollback point: `fd1d7eb` (`2026-07-16-r253`).

---

## 2026-07-16-r253

- Release ID: `2026-07-16-r253`
- Date/Time (Asia/Shanghai): `2026-07-16`
- Deployment status: `LIVE` at runtime commit `fd1d7eb`
- Scope: include issued and void partner Credit Notes in Finance Documents, while showing each partner invoice's original amount, issued credit, adjusted amount, and remaining balance consistently on screen and in Excel.
- Key files:
  - `lib/finance-documents.ts`
  - `app/admin/finance/documents/page.tsx`
  - `app/api/exports/finance-documents/route.ts`
  - `tests/finance-documents.test.ts`
  - `docs/tasks/TASK-20260716-finance-documents-credit-notes.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low-to-medium and read-side only. This release does not change invoice, receipt, Credit Note issue/void, settlement, package, attendance, payroll, or stored billing data. Only `ISSUED` Credit Notes reduce adjusted balances; `VOID` notes remain visible for audit but have no amount effect, and `DRAFT` notes remain in the Credit Note workspace.
- Verification:
  - `npx tsx --test tests/finance-documents.test.ts tests/partner-credit-notes.test.ts` (9/9)
  - `npx tsc --noEmit`
  - `npm run build` (193 pages)
  - authenticated Finance Playwright check using production data confirmed `RGT-202606-0019`: SGD 18,540 original, SGD 270 issued credit, SGD 18,270 adjusted/remaining
  - authenticated Finance Playwright check confirmed `RGT-CN-202607-0001` appears as ISSUED with PDF, PDF + Seal, original-invoice link, and Excel export HTTP 200
  - temporary auth sessions were deleted after checks
- Rollback point: `6a0b106` (`2026-07-14-r252` documentation head; runtime feature commit `d705793`).

---

## 2026-07-14-r252

- Release ID: `2026-07-14-r252`
- Date/Time (Asia/Shanghai): `2026-07-14`
- Deployment status: `LIVE` at runtime commit `d705793`
- Scope: align employee-miniapp student scheduling with the web workflow: opening a student is read-only, ADMIN direct scheduling creates Sessions without a Ticket, and a coordination Ticket requires an explicit course and coordination reason.
- Key files:
  - `app/api/miniapp/staff/first-scheduling/route.ts`
  - `app/api/miniapp/staff/students/[studentId]/scheduling/route.ts`
  - `lib/miniapp-first-scheduling.ts`
  - `lib/miniapp-ticket-new-session.ts`
  - `miniapp/boss-academic-parent/pages/staff-first-scheduling/*`
  - `miniapp/boss-academic-parent/pages/staff-student-scheduling/*`
  - `scripts/cancel-legacy-miniapp-auto-scheduling-tickets.ts`
- Risk impact (if any): Medium and isolated to employee-miniapp scheduling. Existing web scheduling, lesson changes, package deduction, attendance, finance and parent visibility are unchanged. Direct scheduling keeps the existing package, finance-gate, qualification, availability, conflict, signed-preview and transaction checks. Coordination creation is serialized and deduplicated by student and course.
- Data correction: five legacy auto-created `Need Info` Tickets (`20260714-001`, `20260713-008`, `20260713-007`, `20260713-003`, `20260713-002`) were marked `Cancelled`, kept unarchived for traceability, and each received an audit row. No Session result or completion timestamp existed on any of them.
- Verification: TypeScript, 66 backend tests, 10 focused miniapp scheduling tests, all miniapp JavaScript syntax, the 28-page miniapp release audit and the full 193-page production build pass. A real read-only Daisy workspace check returned one course, 19 qualified teachers, four campuses and 12 upcoming sessions while the open employee-miniapp scheduling Ticket count remained `0 -> 0`. Production is running `d705793`, PM2 is online with zero restarts, `/admin/login` returns `200`, all five cancelled Tickets retain five audit rows, and the open employee-miniapp scheduling Ticket count remains `0` after deployment.
- Rollback point: `a24d06d` (`2026-07-14-r251`).

---

## 2026-07-14-r251

- Release ID: `2026-07-14-r251`
- Date/Time (Asia/Shanghai): `2026-07-14`
- Deployment status: `LIVE` at runtime commit `a24d06d`
- Scope: keep long Credit Note numbers on one fitted line in the PDF header so they cannot overlap the original-invoice row.
- Key files:
  - `app/api/exports/partner-credit-note/[id]/route.ts`
- Risk impact (if any): Low and isolated to the new Credit Note PDF header. No database, workflow, amount, permission, invoice, receipt or settlement behavior changes.
- Verification: TypeScript, all 66 backend tests and the full 193-page production build pass. Production deployment is healthy with PM2 online, zero restarts and `/admin/login` returning `200`. A deliberately longer-than-production demo number remained on one line in the live PDF, with no overlap against the original invoice row; the demo Credit Note, line and temporary auth session were cleaned back to zero.
- Rollback point: `ba72d02` (`2026-07-14-r250`).

---

## 2026-07-14-r250

- Release ID: `2026-07-14-r250`
- Date/Time (Asia/Shanghai): `2026-07-14`
- Deployment status: `LIVE` at runtime commit `ba72d02`
- Scope: add an isolated Credit Note ledger for partner invoices, including partial line credits, independent tracking numbers, draft/issue/void controls, adjusted-net display and a printable PDF linked to the original invoice.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260714180000_add_partner_credit_notes/migration.sql`
  - `lib/partner-credit-notes.ts`
  - `lib/partner-billing.ts`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/partner-credit-note/[id]/route.ts`
  - `tests/partner-credit-notes.test.ts`
  - `tests/partner-credit-note-migration-safety.test.ts`
  - `docs/tasks/TASK-20260714-partner-credit-notes.md`
- Risk impact (if any): Medium and isolated to partner billing. The migration creates only `CreditNote` and `CreditNoteLine`; it does not alter existing invoice JSON, receipts, settlements, students, packages, lessons, attendance or payroll. Drafts do not change adjusted totals. Only issued, non-void notes reduce the displayed net. Existing invoices with any Credit Note history cannot be deleted, and existing receipts remain unchanged for finance review.
- Verification: Prisma validation and generation, TypeScript, all 66 backend tests, migration-safety assertions, the full 193-page production build and `git diff --check` pass. The New Oriental case is covered as an SGD 270 partial credit against `RGT-202606-0019`. Production has 105 completed migrations, PM2 is online with zero restarts, `/admin/login` returns `200`, and post-deploy protected counts and billing JSON hashes match the pre-deploy baseline. SOP capture drafts were cleaned back to zero Credit Notes and zero lines.
- Rollback point: previous production runtime `60d00d8` (`2026-07-14-r249`); deployed feature commit is `ba72d02`.

---

## 2026-07-14-r249

- Release ID: `2026-07-14-r249`
- Date/Time (Asia/Shanghai): `2026-07-14`
- Deployment status: `LIVE` at runtime commit `60d00d8`
- Scope: differentiate university-stage care into university academic management, postgraduate preparation and internship/employment support, with programme-specific scopes and owner roles, a university profile, academic position, adult-student consent and granular parent-report eligibility.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260714113000_add_care_university_profiles/migration.sql`
  - `lib/care-validation.ts`
  - `lib/care-management.ts`
  - `app/admin/care/page.tsx`
  - `app/admin/care/[id]/page.tsx`
  - `app/admin/care/_components/CareProgramSetupFields.tsx`
  - `tests/care-university-config.test.ts`
  - `docs/tasks/TASK-20260714-care-university-differentiation.md`
- Risk impact (if any): Medium and isolated to CARE configuration. The migration adds one enum value, one consent enum and one university-profile table; no existing project or protected teaching/finance table is updated. Both pre-university programme defaults remain byte-for-byte equivalent in tests. Existing university projects retain earlier selected scopes and show them as retained until a manager reviews them. University parent-report eligibility is blocked until adult-student consent and at least one authorized section are recorded.
- Verification: Prisma validation and generation, TypeScript, all 60 backend tests and the full 193-page production build pass. Production has 104 completed migrations, including the new university-profile table and postgraduate enum value. PM2 is online with zero restarts and `/admin/login` returns `200`. Authenticated production browser checks passed programme switching for all five care programmes, retained-scope display on the existing NUS draft, university-profile save, consent blocking before authorization, parent-report eligibility after limited authorization, and desktop/mobile layout without horizontal overflow. The temporary student, project, profile, activity, session and three associated audit rows were removed with zero residue. Protected baselines returned to 89 students, 78 packages, 1,899 sessions, 1,711 attendance rows, 34 partner settlements and 2/0/1/0/0 care engagements/plans/activities/tasks/attachments; the two real projects and their selected scopes remained unchanged.
- Rollback point: previous production runtime `7bf4b04` (`2026-07-14-r248`); deployed runtime commit is `60d00d8`.

---

## 2026-07-14-r248

- Release ID: `2026-07-14-r248`
- Date/Time (Asia/Shanghai): `2026-07-14`
- Deployment status: `LIVE` at runtime commit `7bf4b04`
- Scope: add private evidence attachments and structured school-communication sources to the isolated full-care workspace, with project-scoped access, activity/task links, archive/restore and audit history.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260714100000_add_care_evidence_attachments/migration.sql`
  - `lib/care-evidence-files.ts`
  - `lib/care-management.ts`
  - `lib/care-validation.ts`
  - `app/admin/care/[id]/page.tsx`
  - `app/admin/care/_components/CareAttachmentUploader.tsx`
  - `app/api/admin/care/engagements/[id]/attachments/route.ts`
  - `app/api/admin/care/attachments/[id]/file/route.ts`
  - `tests/care-evidence.test.ts`
  - `docs/tasks/TASK-20260714-care-evidence-attachments.md`
- Risk impact (if any): Medium and isolated to CARE. Files are stored under a private S3/local CARE path and every download rechecks care-project access. The migration only adds one enum and one table; it does not alter students, sessions, attendance, packages, partner settlement, payroll, invoices, receipts or finance settings. Parent delivery remains disabled; `PARENT` means eligible for a later reviewed report, not immediately visible.
- Verification: Prisma validation, TypeScript, all 53 backend tests and the full 193-page production build pass. Production-mode Playwright used a temporary student/project to upload a school-email file, link it to a school update, open/download it, archive it and restore it. Production deployment found all 103 migrations current, PM2 online with zero restarts and `/admin/login` returning `200`. A second temporary project on `sgtmanage.com` uploaded and listed a school-email file; unauthenticated access returned `401`, authorized access returned a private signed `302`, and the signed object returned the original content. The temporary student, session, project, attachment, audit rows and S3 objects were cleaned to zero. Before/after counts remained 88 students, 78 packages, 1,895 sessions, 1,711 attendance rows, 34 partner settlements and 1/0/1/0/0 care engagements/plans/activities/tasks/attachments.
- Rollback point: current production runtime `a8a261f` (`2026-07-13-r246`); immediate Git parent `1d1e395` is the prepared `2026-07-14-r247` parent service-progress source.

---

## 2026-07-14-r247

- Release ID: `2026-07-14-r247`
- Date/Time (Asia/Shanghai): `2026-07-14`
- Deployment status: `READY`
- Scope: add the native parent service-progress center for all students, with this-week lesson/feedback/request summaries, responsible person, next step, parent-visible action items, and a unified timeline of lessons, feedback, requests, and formally published full-care updates.
- Key files:
  - `app/api/miniapp/students/[studentId]/service-progress/route.ts`
  - `lib/miniapp-parent-service-progress.ts`
  - `miniapp/boss-academic-parent/pages/progress/*`
  - `miniapp/boss-academic-parent/pages/home/*`
  - `tests/miniapp-parent-service-progress.test.ts`
  - `docs/tasks/TASK-20260714-miniapp-parent-service-progress.md`
- Risk impact (if any): Medium read-side and privacy-sensitive parent experience. The endpoint requires parent report permission, respects schedule and feedback permissions, reads only parent-visible Tickets, and exposes full-care activities only when published to parents. It does not add database tables or any write path. All 88 current students have a null service type and therefore temporarily receive ordinary-course wording without changing stored data; management must classify them before relying on type-specific messaging.
- Verification: 49 existing backend tests plus 5 new progress tests and 4 retained calendar tests pass; TypeScript, all native-miniapp JavaScript syntax, the 27-page release audit, an authenticated read-only real-data endpoint check, and the full 193-page production build pass. The real-data call returned HTTP 200; one active care engagement currently has zero parent-published activities and zero parent-visible action tasks. Physical-phone confirmation remains for the next experience version.
- Rollback point: `2026-07-13-r246` (`a8a261f`).

---

## 2026-07-13-r246

- Release ID: `2026-07-13-r246`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE` at runtime commit `a8a261f`
- Scope: add the native-miniapp visual scheduling calendar with month/week/day views, teacher/campus/course/student filters, daily coordination and overlap indicators, teacher free slots, and date/time handoff into the existing all-student scheduling workflow.
- Key files:
  - `app/api/miniapp/staff/schedule/calendar/route.ts`
  - `lib/miniapp-staff-schedule-calendar.ts`
  - `prisma/schema.prisma`
  - `miniapp/boss-academic-parent/pages/staff-schedule/*`
  - `miniapp/boss-academic-parent/pages/staff-first-scheduling/staff-first-scheduling.js`
  - `miniapp/boss-academic-parent/pages/staff-coordination-detail/staff-coordination-detail.js`
  - `tests/miniapp-staff-schedule-calendar.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-visual-scheduling-calendar.md`
- Risk impact (if any): Medium read-side and navigation change. The calendar adds a range query and operational overlap indicators but does not add a scheduling write path. Prisma `relationJoins` is enabled so this query can load nested relations in one database query; other Prisma calls keep their existing strategy. Formal scheduling remains ADMIN-only and continues through the existing signed preview and second confirmation. CS can coordinate but not write Sessions; teachers remain constrained to their own schedule.
- Verification: 49 existing backend tests and 4 new calendar tests pass; TypeScript, JavaScript syntax, the 26-page release audit, a 42-day real-data read, and the full 193-page production build pass. Real data returned 244 visible lessons across 49 teachers after hiding one fully cancelled lesson, and produced 124 free slots for a selected teacher. Single-query relation loading reduced the local 42-day read from about 16 seconds to 2.4 seconds. Production improved from 62.64 seconds to 9.98 seconds for 42 days and returned 7 days in 8.64 seconds; PM2 is online with zero restarts, 102 migrations are current, health is 200, and one reminder cron remains. Physical-phone visual confirmation remains for the next experience version.
- Rollback point: `2026-07-13-r245` (`4276638`).

---

## 2026-07-13-r245

- Release ID: `2026-07-13-r245`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `READY`
- Scope: add a complete parent logout flow to the authenticated miniapp student page, including confirmation, server-session invalidation, local student/session cleanup, and return to the parent login page.
- Key files:
  - `miniapp/boss-academic-parent/pages/students/students.js`
  - `miniapp/boss-academic-parent/pages/students/students.wxml`
  - `scripts/audit-miniapp-release.ts`
  - `tests/miniapp-login-entry.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-parent-logout.md`
- Risk impact (if any): Low and client-side integration only. The existing parent logout endpoint is reused without backend changes. Parent logout clears only the parent session and selected student; an employee session on the same WeChat account is not deleted.
- Verification: all native-miniapp JavaScript syntax checks, 18 focused tests, the 26-page release audit, TypeScript, and the full 192-page production build pass. The logout-flow test executes the confirmation path and verifies server logout, parent-session cleanup, selected-student cleanup, parent-portal retention, and login-page relaunch in order. Physical-phone confirmation remains for the next experience version.
- Rollback point: `2026-07-13-r244` (`62d6afc`).

---

## 2026-07-13-r244

- Release ID: `2026-07-13-r244`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `READY`
- Scope: remove the employee-portal switch from the authenticated parent student page so the parent experience stays entirely parent-facing after login.
- Key files:
  - `miniapp/boss-academic-parent/pages/students/students.js`
  - `miniapp/boss-academic-parent/pages/students/students.wxml`
  - `scripts/audit-miniapp-release.ts`
  - `tests/miniapp-login-entry.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-authenticated-parent-purity.md`
- Risk impact (if any): Low and client-side only. Employee login remains available from the unauthenticated login screen, and the employee workbench still allows returning to the parent portal. Authentication APIs, tokens, bindings, permissions, and business data are unchanged.
- Verification: all native-miniapp JavaScript syntax checks, 17 focused tests, the 26-page release audit, TypeScript, and the full 192-page production build pass. The release audit now fails if authenticated parent pages contain employee-entry wording or employee-login navigation; WeChat DevTools recompiled the package and confirmed the employee-to-parent journey still opens correctly.
- Rollback point: `2026-07-13-r243` (`a350bf5`).

---

## 2026-07-13-r243

- Release ID: `2026-07-13-r243`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `READY`
- Scope: separate parent and employee login journeys, remove invitation binding from the first-screen hierarchy, remember the last-used portal, and retain low-priority switching for dual-role WeChat users.
- Key files:
  - `miniapp/boss-academic-parent/app.js`
  - `miniapp/boss-academic-parent/app.wxss`
  - `miniapp/boss-academic-parent/pages/login/*`
  - `miniapp/boss-academic-parent/pages/staff-login/*`
  - `miniapp/boss-academic-parent/pages/students/*`
  - `miniapp/boss-academic-parent/pages/staff-home/*`
  - `scripts/audit-miniapp-release.ts`
  - `tests/miniapp-login-entry.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-login-portal-separation.md`
- Risk impact (if any): Low and client-side only. Authentication endpoints, permissions, tokens, invitations, and bindings are unchanged. The main remaining risk is stored-session behavior on a physical WeChat device; dual-role users retain explicit portal switches after login.
- Verification: all miniapp JavaScript syntax checks, 17 focused tests, the 26-page release audit, TypeScript, and the full 192-page production build pass. WeChat DevTools on an iPhone 12/13 simulator confirms the parent-first hierarchy, separate employee page, and two-way portal navigation render without overlap.
- Rollback point: `2026-07-13-r242` (`d15016a`).

---

## 2026-07-13-r242

- Release ID: `2026-07-13-r242`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `READY`
- Scope: make the shared admin workspace title and hint follow the current client-side route so leaving Full Care no longer leaves `Full Care / 全托管` stuck above unrelated pages.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/_components/AdminWorkspaceContextClient.tsx`
  - `app/admin/_components/adminWorkspaceContext.ts`
  - `tests/admin-workspace-context.test.ts`
  - `package.json`
  - `docs/tasks/TASK-20260713-admin-workspace-context-navigation.md`
  - `docs/全托管业务系统总体规划-20260713.md`
- Risk impact (if any): Low and display-only. The change moves existing title/hint selection into a client route-aware component. It does not change permissions, navigation destinations, schemas, student data, care records, scheduling, attendance, packages, partner settlement, payroll, invoices, receipts, or finance settings.
- Verification: TypeScript passes; all 49 backend tests pass; the full 192-page production build passes. A production-mode Playwright flow with one temporary admin session verifies `Full Care -> Student Sources -> Full Care` without page refresh: the top title changes to `Admin Workspace / 管理工作台` on Student Sources, contains no Full Care label there, and restores Full Care on return. Temporary QA sessions were cleaned to zero.
- Rollback point: `2026-07-13-r241` documentation-aligned head `16afda6` (production runtime `1a553e1`).
- Production commit: `d15016a48825f6c61f24917937a19791c9d82c4a`.
- Deployment result: backup `tuition-scheduler_2026-07-13_192426.dump` completed; 102 migrations remain current with none applied; the 192-page server build passed; PM2 is online with zero restarts; `/admin/login` returns `200`. Authenticated production Playwright again passed `Full Care -> Student Sources -> Full Care`, and the temporary session count returned to zero. Packages, attendance totals, package transactions, partner settlements, protected finance-setting hashes, and existing care counts remained unchanged. Session count changed from 1895 to 1891 because Eva separately used the audited `delete_safe` workflow four times between 19:22 and 19:25; the four audit rows exactly account for the difference and are unrelated to this display-only release.

---

## 2026-07-13-r241

- Release ID: `2026-07-13-r241`
- Date/Time (Asia/Shanghai): `2026-07-13`
- Deployment status: `LIVE`
- Scope: make shared packages available to every linked student while isolating one-to-one lessons, feedback, and reminders by the session's actual student.
- Key files:
  - `lib/session-students.ts`
  - `lib/miniapp-first-scheduling.ts`
  - `lib/miniapp-course-reminder-coverage.ts`
  - `lib/miniapp-feedback-notification.ts`
  - `app/api/miniapp/students/[studentId]/*`
  - `app/api/miniapp/feedbacks/[feedbackId]/route.ts`
  - `app/api/miniapp/staff/scheduling-coordination/[ticketId]/route.ts`
  - `tests/miniapp-first-scheduling.test.ts`
  - `tests/miniapp-feedback-notification.test.ts`
  - `docs/tasks/TASK-20260713-miniapp-shared-package-student-scope-fix.md`
- Risk impact (if any): Medium and corrective. The release narrows parent-visible lesson, feedback, and reminder reads for capacity-one classes to the actual session student, while broadening internal scheduling-package eligibility to include explicitly shared packages. It does not rewrite data or change package balances, ledger deductions, finance gates, attendance, payroll, invoices, receipts, or financial-document access.
- Verification: TypeScript, 22 focused tests, the 26-page miniapp release audit, and the full 192-page production build pass. Read-only real-data checks show Daisy ready with the shared package, no prerequisite blocker, 24 correctly attributed future lessons, and zero foreign explicit students; Louis is ready for renewal with zero future lessons instead of inheriting Daisy's schedule.
- Rollback point: `2026-07-13-r240` documentation-aligned head `efff27a` (production runtime `caa9cbd`).
- Production commit: `1a553e11d5f4d69528bc759dad49f37f7df408d5`.
- Deployment result: release-doc gate and the 192-page server build passed; 102 migrations remain current with none applied; PM2 is online with zero restarts; `/admin/login` returns `200`. Authenticated production miniapp API checks return Daisy as ready with `101小时15分钟 · 共享课包主学生：王嘉毅（Louis）` and Louis as ready for renewal with `101小时15分钟 · 与 王钰澄（Daisy） 共用`; neither has a prerequisite blocker.

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
- Scope: fix renewal contract parent-intake links for existing students who do not have reusable parent profile data yet. These renewal contracts now keep the parent profile form open until parent details are submitted, instead of showing `No intake needed / 无需填写资料`.
- Key files:
  - `app/contract-intake/[token]/page.tsx`
  - `docs/tasks/TASK-20260623-renewal-intake-without-parent-profile.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes the public intake page guard for renewal contracts that are still waiting for parent info and have no parent profile saved. Renewal contracts with reusable parent info, formal sign links, signed contracts, invoices, receipts, scheduling, attendance deduction, package balances, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw behavior are unchanged.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-06-23-r201`.

---

## 2026-06-23-r200

- Release ID: `2026-06-23-r200`
- Date/Time (Asia/Shanghai): `2026-06-23`
- Deployment status: `READY`
- Scope: improve the Manager Quality Desk `Give feedback / 给反馈` action so clicking from the Lead Desk table jumps directly to the feedback form and shows the selected teacher/session context.
- Key files:
  - `app/admin/manager/quality/page.tsx`
  - `docs/tasks/TASK-20260623-manager-feedback-link-scroll.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI navigation and context hint improvement only. It does not change feedback storage, teacher acknowledgement, scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-06-23-r200`.

---

## 2026-06-23-r199

- Release ID: `2026-06-23-r199`
- Date/Time (Asia/Shanghai): `2026-06-23`
- Deployment status: `READY`
- Scope: add a private Manager Feedback workflow so managers can send classroom quality comments to individual teachers from Manager Quality Desk, and teachers can review and acknowledge their own feedback in the teacher portal.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260623110000_add_manager_teacher_feedback/migration.sql`
  - `lib/manager-teacher-feedback.ts`
  - `lib/manager-quality-workspace.ts`
  - `app/admin/manager/quality/page.tsx`
  - `app/teacher/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/manager-feedback/page.tsx`
  - `docs/tasks/TASK-20260623-manager-teacher-feedback.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds a new isolated feedback table and teacher-facing read/acknowledge view. It does not change scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - `npx prisma generate`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-23-r199`.

---

## 2026-06-22-r198

- Release ID: `2026-06-22-r198`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: add EduTrust contract Schedule setup defaults so SSG Standard PEI-Student Contract v4.0 can fill official Schedule A-D fields from course-level configuration, and block SSG sign-link preparation when required Schedule data is incomplete.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260622170000_add_edutrust_contract_setup/migration.sql`
  - `app/admin/edutrust/page.tsx`
  - `app/admin/edutrust/EduTrustCourseProfilesClient.tsx`
  - `app/api/admin/edutrust/course-profiles/route.ts`
  - `lib/ssg-standard-pei-contract-v4.ts`
  - `lib/student-contract-template.ts`
  - `lib/student-contract.ts`
  - `tests/student-contract-mode.test.ts`
  - `docs/tasks/TASK-20260622-edutrust-course-readiness-phase1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds a nullable EduTrust contract setup table and extends the admin-only EduTrust readiness page. Existing tuition contracts remain on `TUITION_AGREEMENT`; SSG v4 contracts can still be drafted only for ready EduTrust courses, and sign-link preparation now requires configured Schedule A-D values. Scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw behavior are unchanged.
- Verification:
  - `npx prisma format`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
  - `npx tsx --test tests/student-contract-mode.test.ts tests/edutrust-student-record.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-22-r198`.

---

## 2026-06-22-r197

- Release ID: `2026-06-22-r197`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: replace the SSG v4 contract summary template with a locked official Standard PEI-Student Contract Version 4.0 template extracted from the official TPGateway DOCX/PDF sources, while keeping system-filled fields limited to PEI identity, student/contracting-party names, course title, course hours, fees, and placeholders where the current system does not yet hold official Schedule data.
- Key files:
  - `lib/ssg-standard-pei-contract-v4.ts`
  - `lib/student-contract-template.ts`
  - `tests/student-contract-mode.test.ts`
  - `docs/tasks/TASK-20260622-edutrust-course-readiness-phase1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. SSG v4 contract snapshots now render the official English PEI-Student Contract v4.0 structure instead of the earlier bilingual summary shell. The template is source-tagged and locked, but fields that are not yet captured by the system remain as official blanks/placeholders rather than guessed values. Normal tuition contracts remain unchanged.
- Verification:
  - Official source checked: TPGateway Standard PEI-Student Contract Version 4.0 PDF and DOCX.
  - `npx tsx --test tests/student-contract-mode.test.ts tests/edutrust-student-record.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-22-r197`.

---

## 2026-06-22-r196

- Release ID: `2026-06-22-r196`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: complete the next EduTrust readiness layer by adding student-level delivery evidence records, a C7 outcomes dashboard, a Section A/B evidence-pack checklist, and a guarded SSG Standard PEI-Student Contract v4.0 creation entry for fully ready EduTrust packages only.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260622153000_add_edutrust_student_records/migration.sql`
  - `lib/edutrust-student-record.ts`
  - `app/admin/edutrust/students/page.tsx`
  - `app/admin/edutrust/students/EduTrustStudentRecordsClient.tsx`
  - `app/api/admin/edutrust/student-records/route.ts`
  - `app/admin/edutrust/page.tsx`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `lib/student-contract.ts`
  - `app/admin/layout.tsx`
  - `tests/edutrust-student-record.test.ts`
  - `docs/tasks/TASK-20260622-edutrust-course-readiness-phase1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds a new nullable student evidence table and a new admin-only EduTrust student evidence workspace. It also exposes SSG v4 contract creation only when the course is marked EduTrust, SSG permission is `PERMITTED`, Course File is `APPROVED`, and package hours meet the configured minimum. Normal tuition contracts remain the default path. Scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw behavior are not changed.
- Verification:
  - Official reference checked: SSG/TPGateway Standard PEI-Student Contract Version 4.0 and EduTrust Guidance Document v4 resources.
  - `npx prisma format`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
  - `npx tsx --test tests/edutrust-student-record.test.ts tests/student-contract-mode.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-22-r196`.

---

## 2026-06-22-r195

- Release ID: `2026-06-22-r195`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: add the foundation for a separate SSG Standard PEI-Student Contract v4.0 mode while keeping all existing tuition contracts on the current tuition agreement mode by default.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260622143000_add_student_contract_mode/migration.sql`
  - `lib/student-contract-template.ts`
  - `lib/student-contract.ts`
  - `tests/student-contract-mode.test.ts`
  - `docs/tasks/TASK-20260622-edutrust-course-readiness-phase1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds a defaulted `contractMode` field and an SSG v4 template path, but does not expose a production UI button for SSG contract creation yet. Existing contracts, signing links, invoice creation, package balances, attendance deduction, scheduling, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, and OpenClaw behavior remain on the existing path.
- Verification:
  - `npx prisma format`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
  - `npx tsx --test tests/student-contract-mode.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-22-r195`.

---

## 2026-06-22-r194

- Release ID: `2026-06-22-r194`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: extend the EduTrust readiness page with a Course File layer so each mapped course can store Criterion 5 evidence fields such as course write-up, admission requirements, learning outcomes, syllabus, lesson plan, assessment plan, teacher deployment, Academic Board approval, Examination Board approval, course review, evidence notes, and approver.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260622133000_add_edutrust_course_files/migration.sql`
  - `app/admin/edutrust/page.tsx`
  - `app/admin/edutrust/EduTrustCourseProfilesClient.tsx`
  - `app/api/admin/edutrust/course-profiles/route.ts`
  - `docs/tasks/TASK-20260622-edutrust-course-readiness-phase1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds a nullable Course File table and editable admin-only text fields for EduTrust readiness. It does not change operational course names, class setup, scheduling, attendance deduction, package balances, tuition contracts, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - `npx prisma format`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-22-r194`.

---

## 2026-06-22-r193

- Release ID: `2026-06-22-r193`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: add the first EduTrust readiness layer so existing operational course names stay unchanged while admin users can map each course to an EduTrust-ready course line, compliance name, public name, delivery mode, permission status, course file status, and minimum-hour threshold.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260622120000_add_edutrust_course_profiles/migration.sql`
  - `lib/edutrust-course-profile.ts`
  - `app/admin/edutrust/page.tsx`
  - `app/admin/edutrust/EduTrustCourseProfilesClient.tsx`
  - `app/api/admin/edutrust/course-profiles/route.ts`
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260622-edutrust-course-readiness-phase1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds nullable EduTrust mapping metadata and a new admin-only readiness page. It does not rename existing courses, subjects, levels, classes, packages, or contracts, and it does not change scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - `npx prisma format`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
  - `npm run build`
  - local smoke check confirmed `/admin/edutrust` compiles and redirects unauthenticated users to `/admin/login`
- Rollback point: previous production commit before `2026-06-22-r193`.

---

## 2026-06-22-r192

- Release ID: `2026-06-22-r192`
- Date/Time (Asia/Shanghai): `2026-06-22`
- Deployment status: `READY`
- Scope: fix the student package utilization Excel export so Chinese student names no longer make the download response fail with HTTP 500.
- Key files:
  - `app/api/exports/student-package-utilization/route.ts`
  - `docs/tasks/TASK-20260622-student-package-utilization-excel-filename.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes the `Content-Disposition` filename fallback for one Excel export. It does not change utilization report data, preview calculations, package balances, attendance deduction, invoices, receipts, contracts, scheduling, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - reproduced the production failure for `王玫卓` as HTTP 500 and confirmed the server log error was a non-ASCII `filename` header ByteString failure
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-22-r192`.

---

## 2026-06-19-r191

- Release ID: `2026-06-19-r191`
- Date/Time (Asia/Shanghai): `2026-06-19`
- Deployment status: `READY`
- Scope: fix final report PDF card layout so long bilingual section titles no longer overlap the section body text.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `docs/tasks/TASK-20260619-final-report-pdf-title-overlap.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes vertical spacing inside final report PDF section cards. It does not change final report data, teacher submission workflow, parent share links, package balances, attendance deduction, invoices, receipts, contracts, scheduling, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - rendered the supplied `final-report-李昱辰-国际学校入学考试.pdf` and confirmed the overlap was caused by fixed body positioning under wrapping bilingual titles
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-19-r191`.

---

## 2026-06-18-r190

- Release ID: `2026-06-18-r190`
- Date/Time (Asia/Shanghai): `2026-06-18`
- Deployment status: `READY`
- Scope: add pre-approved scheduling exception capture to package creation when staff manually exempt a direct-billing package from the invoice-before-scheduling gate.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/api/admin/packages/route.ts`
  - `docs/tasks/TASK-20260618-pre-approved-scheduling-exception.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only adds required approval metadata for manual invoice-gate exemptions at package creation and stores it in existing package finance-gate reason/note fields. It does not change scheduling eligibility rules, attendance deduction, package balances, invoice numbering, receipts, contracts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - verified manual invoice-gate exemptions now require approver and reason before submit
  - verified partner-settlement package exemptions still stay outside the new manual-exception fields
- Rollback point: previous production commit before `2026-06-18-r190`.

---

## 2026-06-17-r189

- Release ID: `2026-06-17-r189`
- Date/Time (Asia/Shanghai): `2026-06-17`
- Deployment status: `READY`
- Scope: add a read-only finance report that extracts one student's deducted package utilization from attendance rows, including shared-package cases such as Coco Xu and Eason Xu.
- Key files:
  - `lib/student-package-utilization-report.ts`
  - `app/admin/finance/student-package-utilization/page.tsx`
  - `app/api/exports/student-package-utilization/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/tasks/TASK-20260617-student-package-utilization.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a read-only finance/admin extraction and Excel export based on existing attendance deductions. It does not change attendance marking, package balances, package ledger transactions, invoice numbering, receipts, scheduling, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw behavior.
- Verification:
  - `npm run build`
  - `npx tsc --noEmit`
  - Local auth smoke check confirmed `/admin/finance/student-package-utilization` compiles and redirects unauthenticated users to `/admin/login`.
  - Read-only data check for `Coco Xu` through `2026-06-17` returned 45 deducted attendance rows and 59.5 deducted hours on shared package `1df7bb95-8de1-4c10-bd7a-6a935af6af0e`.
- Rollback point: previous production commit before `2026-06-17-r189`.

---

## 2026-06-12-r188

- Release ID: `2026-06-12-r188`
- Date/Time (Asia/Shanghai): `2026-06-12`
- Deployment status: `DEPLOYED`
- Scope: prevent the Manager Quality Desk daily manager reflection form from stretching to match the taller right-side quality snapshot column.
- Key files:
  - `app/admin/manager/quality/page.tsx`
  - `docs/tasks/TASK-20260612-manager-quality-reflection-layout.md`
- Risk impact (if any): Low. This is a layout-only change on the manager quality desk. It does not change saved reflection data, Lead Desk rows, feedback quality logic, report follow-up logic, approvals, billing, receipts, packages, attendance, scheduling, payroll, partner settlement, transport billing, school applications, or Business Accounts.
- Verification:
  - `npm run build`
- Rollback point: previous production state before `2026-06-12-r188`.

---

## 2026-06-05-r187

- Release ID: `2026-06-05-r187`
- Date/Time (Asia/Shanghai): `2026-06-05`
- Deployment status: `DEPLOYED`
- Scope: make the school application public signing page show the full agreement terms, add agreement PDF preview before signing, require a handwritten signature, store the signature image, and include it in the signed school application PDF.
- Key files:
  - `app/school-application/[token]/page.tsx`
  - `lib/school-application.ts`
  - `lib/school-application-pdf.ts`
  - `docs/tasks/TASK-20260605-school-application-full-signature-page.md`
- Risk impact (if any): Low to medium. This changes only the school application service signing page and signed agreement PDF output. It does not change student tuition contracts, package balances, attendance deductions, receipt approval, invoice numbering rules, scheduling, payroll, partner settlement, transport billing, or Business Accounts.
- Verification:
  - `npm run build`
  - `npx tsc --noEmit --pretty false`
  - Local smoke tested `signSchoolApplication` without `signatureDataUrl` and confirmed it rejects with `Handwritten signature is required`.
- Rollback point: previous production state before `2026-06-05-r187`.

---

## 2026-06-05-r186

- Release ID: `2026-06-05-r186`
- Date/Time (Asia/Shanghai): `2026-06-05`
- Deployment status: `DEPLOYED`
- Scope: add required-field markers and a client-side save guard to the school application draft form so missing required fields or zero total amount are caught before a server redirect can refresh the page and lose unsaved input.
- Key files:
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `app/admin/students/[id]/school-applications/SchoolApplicationDraftGuard.tsx`
  - `docs/tasks/TASK-20260605-school-application-required-fields.md`
- Risk impact (if any): Low. This only changes the school application draft form validation experience. It does not change saved school application data structures, invoice numbering, receipt approval, package balances, attendance deductions, scheduling, payroll, partner settlement, transport billing, student contracts, or Business Accounts.
- Verification:
  - `npm run build`
  - `npx tsc --noEmit --pretty false`
- Rollback point: previous production state before `2026-06-05-r186`.

---

## 2026-06-05-r185

- Release ID: `2026-06-05-r185`
- Date/Time (Asia/Shanghai): `2026-06-05`
- Deployment status: `DEPLOYED`
- Scope: clarify school application agreement PDF labels and prevent empty school-application drafts from opening a 500 error when the agreement PDF is not ready.
- Key files:
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `app/api/exports/school-application/[id]/route.ts`
  - `docs/tasks/TASK-20260605-school-application-agreement-pdf-label-and-empty-draft.md`
- Risk impact (if any): Low. This changes only the school application agreement PDF label and not-ready handling. It does not change contract content, signing, invoice numbering, receipt approval, lesson packages, attendance, scheduling, payroll, partner settlement, transport billing, or Business Accounts.
- Verification:
  - `npm run build`
  - `npx tsc --noEmit --pretty false`
  - Smoke tested an empty temporary school application draft by calling the PDF export route directly and confirmed it returns `400 Agreement PDF is not ready` instead of `500`.
- Rollback point: previous production state before `2026-06-05-r185`.

---

## 2026-06-05-r184

- Release ID: `2026-06-05-r184`
- Date/Time (Asia/Shanghai): `2026-06-05`
- Deployment status: `DEPLOYED`
- Scope: add a delete action for school application parent information links so old public tokens can be revoked without removing already submitted parent details.
- Key files:
  - `lib/school-application.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `docs/tasks/TASK-20260605-school-application-parent-info-link-delete.md`
- Risk impact (if any): Low. This only clears `parentInfoToken`, expiry, and viewed timestamp on school application services. It does not delete parent info, submitted timestamp, contracts, invoices, receipts, lesson packages, attendance, scheduling, payroll, partner settlement, transport billing, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested with a temporary student: generated a school application parent info link, submitted parent info, deleted the link, verified the old token no longer resolves, verified parent info and submitted timestamp remain, then cleaned up temporary rows.
- Rollback point: previous production state before `2026-06-05-r184`.

---

## 2026-06-04-r183

- Release ID: `2026-06-04-r183`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `DEPLOYED`
- Scope: add a dedicated parent information collection link for school application services, with reuse from existing student-contract or parent-intake details, parent submission status tracking, and safe write-back to the school application draft and student school/grade details.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260604183000_add_school_application_parent_info_link/migration.sql`
  - `lib/school-application.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `app/school-application-info/[token]/page.tsx`
  - `docs/tasks/TASK-20260604-school-application-parent-info-link.md`
- Risk impact (if any): Low to medium. This adds nullable school-application fields and a new public token page. It does not change normal lesson packages, lesson balance deduction, attendance, invoice numbering, receipt approval, student-contract signing, payroll, partner settlement, transport billing, or Business Accounts.
- Verification:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested with a temporary student: created school application draft, generated parent info link, submitted parent details, verified application parent info and `billTo` updated, verified student school/grade/note updated, verified service billing case stayed at `0` total minutes and `0` remaining minutes, then cleaned up the temporary rows.
- Rollback point: previous production state before `2026-06-04-r183`.

---

## 2026-06-04-r182

- Release ID: `2026-06-04-r182`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: improve the school application workspace usability by keeping parent name blank by default, preserving the school-application entry context, returning to the school application list when appropriate, and remembering sidebar scroll during form refreshes.
- Key files:
  - `lib/school-application.ts`
  - `app/admin/school-applications/page.tsx`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/_components/SidebarScrollMemoryClient.tsx`
  - `docs/tasks/TASK-20260604-school-application-workspace-usability.md`
- Risk impact (if any): Low. This changes only school application workspace defaults, navigation context, and sidebar scroll memory. It does not change invoice numbering, receipt approval, lesson package balances, attendance deduction, scheduling, payroll, partner settlement, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Checked local and server code for removal of the school-application service-hours UI and verified parent-name defaults no longer use the student name.
- Rollback point: previous production state before `2026-06-04-r182`.

---

## 2026-06-04-r181

- Release ID: `2026-06-04-r181`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: upgrade school application service agreements to remove misleading service-hour wording, keep the contract scoped by application schools and fees, and add sealed contract PDF export after parent signing.
- Key files:
  - `lib/school-application-pdf.ts`
  - `lib/school-application.ts`
  - `app/api/exports/school-application/[id]/route.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `docs/tasks/TASK-20260604-school-application-sealed-contract.md`
- Risk impact (if any): Low. This changes only school application agreement PDF wording/export and the school application admin form. It does not change receipt approval rules, invoice numbering, lesson package balances, attendance deduction, scheduling, payroll, partner settlement, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - Generated signed and sealed sample school application agreement PDFs.
  - Rendered the sealed sample PDF and confirmed `Service Hours`, `service hours`, and `服务时数` are absent; the agreement title and Appendix A are present; the company seal appears in the agency signature box.
- Rollback point: previous production commit before `2026-06-04-r181`.

---

## 2026-06-04-r180

- Release ID: `2026-06-04-r180`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: make school application services use a separate `School Application Service` billing case for both new and existing students, so application invoices and receipts do not get mixed into normal lesson packages.
- Key files:
  - `lib/school-application.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `docs/tasks/TASK-20260604-school-application-service-billing-case.md`
- Risk impact (if any): Low. This changes only how school application service records choose their billing case. It does not change receipt approval rules, invoice numbering, lesson package balances, attendance deduction, scheduling, payroll, partner settlement, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested with a temporary student that had a normal lesson package: school application draft creation and save both used the separate service billing case, ignored the normal lesson package override, left normal package remaining minutes at `4800`, and cleanup left `0` temporary students.
- Rollback point: previous production commit before `2026-06-04-r180`.

---

## 2026-06-04-r179

- Release ID: `2026-06-04-r179`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: allow admins to delete voided school application service records only when the record is not linked to an invoice, while keeping invoice-linked voided records for audit history.
- Key files:
  - `lib/school-application.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `docs/tasks/TASK-20260604-school-application-void-delete.md`
- Risk impact (if any): Low. This only adds a guarded delete path for voided school application service records without invoice linkage. It does not change invoice numbering, receipts, lesson package balances, signing, attendance, payroll, partner settlement, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested with a temporary student: non-void record delete was blocked, voided record without invoice was deleted, voided record with invoice marker was blocked, and temporary test student cleanup left `0` rows.
- Rollback point: previous production commit before `2026-06-04-r179`.

---

## 2026-06-04-r178

- Release ID: `2026-06-04-r178`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: split school application level entry into school-facing grade and internal equivalent level so British Year 13 can be shown as Grade 12 equivalent while keeping the school's own level wording on the agreement.
- Key files:
  - `lib/school-application-directory.ts`
  - `lib/school-application.ts`
  - `lib/school-application-pdf.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `app/school-application/[token]/page.tsx`
  - `docs/tasks/TASK-20260604-school-application-grade-equivalency.md`
- Risk impact (if any): Low. This changes school application service display and JSON payloads only. It does not change invoice numbering, receipt approval, lesson balances, attendance, scheduling, payroll, partner settlement, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested a temporary no-package student with `Year 13`; confirmed saved item, signing snapshot, and generated PDF all carry `Grade 12 equivalent`. Confirmed remaining temporary students: `0`.
- Rollback point: previous production commit before `2026-06-04-r178`.

---

## 2026-06-04-r177

- Release ID: `2026-06-04-r177`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: replace free-text school application rows with a selectable school/application directory, including AEIS/S-AEIS options and Singapore international school options, and allow new students with no lesson package to use the school application service by creating a service billing case only when invoice creation is needed.
- Key files:
  - `lib/school-application-directory.ts`
  - `lib/school-application.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `docs/tasks/TASK-20260604-school-application-directory-and-service-billing.md`
- Risk impact (if any): Medium. This changes school application service data entry and no-package billing fallback. It does not change lesson balance deduction, attendance, scheduling, payroll, partner settlement, Business Accounts, transport billing, or existing student contract workflows.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested a temporary no-package student through directory-based AEIS and international-school selection, draft save, sign-link preparation, PDF generation, and cleanup. Confirmed remaining temporary students: `0`.
- Rollback point: previous production commit before `2026-06-04-r177`.

---

## 2026-06-04-r176

- Release ID: `2026-06-04-r176`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: make the school application service workflow easier to find by adding a dedicated `/admin/school-applications` entry page, a sidebar link, and a first-screen student detail shortcut.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/school-applications/page.tsx`
  - `app/admin/students/[id]/page.tsx`
- Risk impact (if any): Low. This changes navigation and discovery only; it does not change signing, invoice creation, receipt handling, lesson balances, attendance, scheduling, payroll, partner settlement, or Business Accounts.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-04-r176`.

---

## 2026-06-04-r175

- Release ID: `2026-06-04-r175`
- Date/Time (Asia/Shanghai): `2026-06-04`
- Deployment status: `READY`
- Scope: add a school application service agreement workflow for parent signing, dynamic 1-5 school fee lines, signed-service PDF export, and automatic parent invoice creation through the existing package billing and receipt process.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260604170000_add_school_application_service/migration.sql`
  - `lib/school-application.ts`
  - `lib/school-application-pdf.ts`
  - `app/admin/students/[id]/school-applications/page.tsx`
  - `app/school-application/[token]/page.tsx`
  - `app/api/exports/school-application/[id]/route.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `lib/finance-documents.ts`
  - `docs/tasks/TASK-20260604-school-application-service.md`
- Risk impact (if any): Medium. This adds a new agreement and invoice source that reuses parent package billing and receipt approvals. It does not change lesson package balances, attendance deduction, scheduling, payroll, transport billing, partner settlement, or Business Accounts.
- Verification:
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Smoke tested a temporary student/package through draft creation, 3-school fee entry, sign-link preparation, PDF generation, and cleanup; confirmed `remainingTestStudents: 0`.
- Rollback point: previous production commit before `2026-06-04-r175`.

---

## 2026-06-02-r174

- Release ID: `2026-06-02-r174`
- Date/Time (Asia/Shanghai): `2026-06-02`
- Deployment status: `READY`
- Scope: add renewal-contract invoice safeguards so staff must choose whether a renewal creates a new invoice or links an existing invoice before the parent sign link is prepared, and make invoice/contract links visible and protected from accidental deletion.
- Key files:
  - `lib/student-contract.ts`
  - `lib/student-contract-invoice-choice.ts`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `lib/finance-documents.ts`
  - `app/admin/finance/documents/page.tsx`
  - `docs/tasks/TASK-20260602-renewal-contract-invoice-safeguards.md`
- Risk impact (if any): Medium. This changes direct-billing student renewal contract signing and parent invoice deletion guards. It does not change attendance deduction, package scheduling logic, payroll, partner settlement, transport billing, Business Accounts, or receipt PDF generation.
- Verification:
  - Read-only Prisma check confirmed Coco's `RGT-202605-0011` invoice is receipted and linked to contract history, so the new option/display path identifies it as protected.
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-02-r174`.

---

## 2026-06-02-r173

- Release ID: `2026-06-02-r173`
- Date/Time (Asia/Shanghai): `2026-06-02`
- Deployment status: `READY`
- Scope: show recent historical teacher sessions that still need teacher feedback on the teacher `My Sessions` page, so overdue feedback tasks do not disappear when they fall outside the normal current timeline.
- Key files:
  - `app/teacher/sessions/page.tsx`
  - `docs/tasks/TASK-20260602-teacher-sessions-historical-feedback-recovery.md`
- Risk impact (if any): Low. This changes only the teacher portal read query and display copy for `My Sessions`; it does not change attendance saves, feedback submission APIs, scheduling, billing, payroll, package balances, or admin workflows.
- Verification:
  - Read-only Prisma check confirmed Ahmar's `2026-05-30 17:00-18:30` missing-feedback session is included by the recovery query.
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-02-r173`.

---

## 2026-06-02-r172

- Release ID: `2026-06-02-r172`
- Date/Time (Asia/Shanghai): `2026-06-02`
- Deployment status: `READY`
- Scope: unify invoice number reservation across parent/student, partner, and Business Accounts so deleted invoice numbers remain reserved and are not reused by the global `RGT-yyyymm-xxxx` sequence.
- Key files:
  - `lib/global-invoice-sequence.ts`
  - `lib/business-accounts.ts`
  - `app/admin/finance/deleted-invoices/page.tsx`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/tasks/TASK-20260602-global-invoice-deleted-number-reservation.md`
- Risk impact (if any): Medium. This changes the global next-invoice-number calculation to include deleted parent/student invoices, deleted partner invoices, and deleted Business Account invoices as fixed reserved numbers. It does not change package balances, receipt PDFs, attendance, scheduling, payroll, or tutor payments.
- Verification:
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-02-r172`.

---

## 2026-06-02-r171

- Release ID: `2026-06-02-r171`
- Date/Time (Asia/Shanghai): `2026-06-02`
- Deployment status: `READY`
- Scope: allow Business Accounts voided receipts/documents to be physically deleted so old voided receipt rows do not accumulate.
- Key files:
  - `app/admin/finance/business-accounts/page.tsx`
  - `lib/business-accounts.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/tasks/TASK-20260602-business-accounts-delete-voided-receipts.md`
- Risk impact (if any): Low to medium. Deletion is restricted to Business Accounts documents already marked `VOID`; linked Business Account payment proof records and files are removed with the deleted voided document. Existing parent/student receipts, New Oriental partner receipts, package balances, payroll, attendance, and scheduling logic are not changed.
- Verification:
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-02-r171`.

---

## 2026-06-01-r170

- Release ID: `2026-06-01-r170`
- Date/Time (Asia/Shanghai): `2026-06-01`
- Deployment status: `READY`
- Scope: add the same payment-proof-first receipt flow to Business Accounts so company transfers are recorded before a receipt is created.
- Key files:
  - `app/admin/finance/business-accounts/page.tsx`
  - `lib/business-accounts.ts`
  - `lib/business-file-storage.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/tasks/TASK-20260601-business-accounts-payment-proof-receipts.md`
- Risk impact (if any): Low to medium. This extends only the new Business Accounts AppSetting store with payment records and links receipts to uploaded company payment proofs. Existing parent/student receipts, New Oriental partner receipts, package balances, payroll, attendance, and scheduling logic are not changed.
- Verification:
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-01-r170`.

---

## 2026-06-01-r169

- Release ID: `2026-06-01-r169`
- Date/Time (Asia/Shanghai): `2026-06-01`
- Deployment status: `READY`
- Scope: align Business Accounts invoice numbers and receipt PDFs with the existing student and New Oriental finance document flow.
- Key files:
  - `lib/global-invoice-sequence.ts`
  - `lib/business-accounts.ts`
  - `lib/business-account-pdf.ts`
  - `app/admin/finance/business-accounts/page.tsx`
  - `docs/tasks/TASK-20260601-business-accounts-global-invoice-receipt-template.md`
- Risk impact (if any): Low to medium. New Business Accounts documents now reserve the same global `RGT-yyyymm-xxxx` invoice sequence used by parent and partner invoices, and Business Accounts receipts now use the same receipt number pattern and PDF layout style. Existing student, New Oriental, partner settlement, package, payroll, attendance, and scheduling logic is not changed.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Generated local sample Business Accounts invoice, receipt, and service report PDFs.
  - Extracted text from the local sample PDFs to confirm `RGT-202605-0099`, `RGT-202605-0099-RC`, GT Educational, OCBC, account number `595214891001`, Shanghai Xin Zhuo Si, and `SGD 1400.00`.
- Rollback point: previous production commit before `2026-06-01-r169`.

---

## 2026-06-01-r168

- Release ID: `2026-06-01-r168`
- Date/Time (Asia/Shanghai): `2026-06-01`
- Deployment status: `READY`
- Scope: clarify Business Accounts remittance fields as GT Educational's receiving account, and default them to the same OCBC remittance details used by existing student and New Oriental invoice PDFs.
- Key files:
  - `lib/business-accounts.ts`
  - `lib/business-account-pdf.ts`
  - `app/admin/finance/business-accounts/page.tsx`
  - `docs/tasks/TASK-20260601-business-accounts-gt-receiving-account.md`
- Risk impact (if any): Low. This changes labels/defaults for the new Business Accounts remittance fields only. It does not modify New Oriental settlement, parent invoices/receipts, package balances, payroll, attendance, or scheduling.
- Verification:
  - Confirmed existing parent and partner invoice PDFs use GT Educational / OCBC remittance details.
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-01-r168`.

---

## 2026-06-01-r167

- Release ID: `2026-06-01-r167`
- Date/Time (Asia/Shanghai): `2026-06-01`
- Deployment status: `READY`
- Scope: reorganize Business Accounts into clearer workflow tabs and align its receipt/payment capture with existing student and New Oriental receipt fields.
- Key files:
  - `app/admin/finance/business-accounts/page.tsx`
  - `lib/business-accounts.ts`
  - `lib/business-account-pdf.ts`
  - `docs/tasks/TASK-20260601-business-accounts-clean-workflow-receipt-fields.md`
- Risk impact (if any): Low to medium. This refines the Business Accounts workspace and its AppSetting-backed receipt metadata only. It does not modify New Oriental partner settlement, parent invoice/receipt workflows, package balances, payroll, attendance, or scheduling.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-06-01-r167`.

---

## 2026-06-01-r166

- Release ID: `2026-06-01-r166`
- Date/Time (Asia/Shanghai): `2026-06-01`
- Deployment status: `READY`
- Scope: upgrade Business Accounts from a Shanghai-only billing page into a reusable company-account workspace with account profiles, bank-transfer payment instructions, draft deletion, issued/paid/void status flow, payment recording, and business receipt PDF export.
- Key files:
  - `lib/business-accounts.ts`
  - `lib/business-account-pdf.ts`
  - `app/admin/finance/business-accounts/page.tsx`
  - `app/api/exports/business-accounts/[id]/receipt/route.ts`
  - `docs/tasks/TASK-20260601-business-accounts-status-payment-receipts.md`
- Risk impact (if any): Medium. This expands the new Business Accounts AppSetting store and PDF exports only. It remains separate from New Oriental partner settlement, parent invoices, receipts approvals, package balances, payroll, attendance, and scheduling.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - Generated local sample Business Accounts invoice, service report, and receipt PDFs; all files were written successfully.
- Rollback point: previous production commit before `2026-06-01-r166`.

---

## 2026-06-01-r165

- Release ID: `2026-06-01-r165`
- Date/Time (Asia/Shanghai): `2026-06-01`
- Deployment status: `READY`
- Scope: add a separate Business Accounts workspace for company-level intercompany invoicing, seeded with Shanghai Xin Zhuo Si details and monthly invoice/service-report PDF generation.
- Key files:
  - `lib/business-accounts.ts`
  - `lib/business-account-pdf.ts`
  - `app/admin/finance/business-accounts/page.tsx`
  - `app/api/exports/business-accounts/[id]/invoice/route.ts`
  - `app/api/exports/business-accounts/[id]/service-report/route.ts`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/tasks/TASK-20260601-business-accounts-intercompany-invoicing.md`
- Risk impact (if any): Medium. This adds a new finance workspace and AppSetting-backed store. It is intentionally separate from New Oriental partner settlement, student package billing, parent invoices, receipts, payroll, and package ledger logic.
- Verification:
  - `npx tsc --noEmit`
  - `npm run build`
  - Generated sample Business Accounts invoice and service report PDFs locally; invoice text extraction confirmed the Shanghai Xin Zhuo Si English name and unified social credit code.
- Rollback point: previous production commit before `2026-06-01-r165`.

---

## 2026-05-31-r164

- Release ID: `2026-05-31-r164`
- Date/Time (Asia/Shanghai): `2026-05-31`
- Deployment status: `READY`
- Scope: add an admin-facing `Convert to Assessment` repair action on the attendance page for rows that were accidentally deducted but should be assessment/waive lessons.
- Key files:
  - `app/admin/sessions/[id]/attendance/page.tsx`
  - `app/admin/sessions/[id]/attendance/AdminSessionAttendanceClient.tsx`
  - `docs/tasks/TASK-20260531-attendance-convert-assessment-button.md`
- Risk impact (if any): Medium. This adds a new repair trigger on the attendance UI, but it reuses the existing attendance save API and package rollback path instead of editing balances directly.
- Verification:
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-31-r164`.

---

## 2026-05-31-r163

- Release ID: `2026-05-31-r163`
- Date/Time (Asia/Shanghai): `2026-05-31`
- Deployment status: `READY`
- Scope: fix attendance ledger consistency checks so assessment/waive saves can reconcile historical auto-repair package transactions that identify the row by `attendanceId` instead of `studentId`.
- Key files:
  - `app/api/admin/sessions/[id]/attendance/route.ts`
  - `app/api/admin/sessions/[id]/attendance/mark-all-present/route.ts`
  - `docs/tasks/TASK-20260531-attendance-waive-legacy-ledger-check.md`
- Risk impact (if any): Medium. This touches attendance save ledger verification only; it does not relax package balance checks, change deduction amounts, payroll, invoices, receipts, or scheduling. It lets the existing checker attribute older repair transactions to the correct student before comparing net ledger movement.
- Verification:
  - `npx tsc --noEmit`
  - Simulated the affected legacy pattern: `attendanceId` repair `-30` plus `studentId` rollback `+30` resolves to net `0`.
  - Read-only production lookup confirmed the failing row used an older repair transaction note with `attendanceId=bc00897f-e395-436f-955d-468ffe75bba5` and no `studentId`.
- Rollback point: previous production commit before `2026-05-31-r163`.

---

## 2026-05-30-r162

- Release ID: `2026-05-30-r162`
- Date/Time (Asia/Shanghai): `2026-05-30`
- Deployment status: `READY`
- Scope: allow Teacher Notices to attach an active Shared Docs file so tutors can open or download the specific guide directly from the notice.
- Key files:
  - `lib/teacher-notices.ts`
  - `app/admin/teacher-notices/page.tsx`
  - `app/teacher/notices/page.tsx`
  - `app/teacher/TeacherNoticeCardClient.tsx`
  - `app/api/shared-docs/[id]/file/route.ts`
  - `tests/teacher-notices.test.ts`
  - `docs/tasks/TASK-20260530-teacher-notice-shared-doc-attachments.md`
- Risk impact (if any): Medium. This release changes teacher-notice attachment display and Shared Docs file authorization for notice-bound files only. It does not open the full Shared Docs library to teachers and does not change payroll, attendance, billing, scheduling, package balances, invoices, or receipts.
- Verification:
  - `npx tsx --test tests/teacher-notices.test.ts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-30-r162`.

---

## 2026-05-29-r161

- Release ID: `2026-05-29-r161`
- Date/Time (Asia/Shanghai): `2026-05-29`
- Deployment status: `READY`
- Scope: replace new tutor payment-profile collection with PayNow or Wise only, while keeping legacy bank-transfer details read-only for finance reference.
- Key files:
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
- Risk impact (if any): Medium. This release changes teacher payout-profile collection, review status, and finance exports, but does not change payroll amount calculation, expense claim approval, lesson scheduling, attendance deduction, package balance, receipt, or invoice logic.
- Verification:
  - `npx prisma generate`
  - `npx tsc --noEmit --pretty false`
  - `npx tsx --test tests/teacher-payment-profile.test.ts`
  - `npm run test:backend`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-29-r161`.

---

## 2026-05-29-r160

- Release ID: `2026-05-29-r160`
- Date/Time (Asia/Shanghai): `2026-05-29`
- Deployment status: `READY`
- Scope: add an owner-manager-only management form for turning Sales and CS workspace access on or off per system user.
- Key files:
  - `app/admin/manager/users/page.tsx`
  - `app/admin/manager/users/_components/UserWorkspaceAccessFormClient.tsx`
  - `app/api/admin/manager/users/[id]/workspaces/route.ts`
  - `lib/staff-roles.ts`
  - `tests/staff-roles.test.ts`
  - `docs/tasks/TASK-20260529-workspace-access-management-form.md`
- Risk impact (if any): Low to medium. This release adds a workspace-access management surface under System User Admin edit mode and restricts writes to the owner manager. It does not change user main-role editing rules, billing, packages, contracts, attendance, payroll, receipts, or scheduling logic.
- Verification:
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx tsx --test tests/staff-roles.test.ts tests/leads.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-29-r160`.

---

## 2026-05-29-r159

- Release ID: `2026-05-29-r159`
- Date/Time (Asia/Shanghai): `2026-05-29`
- Deployment status: `READY`
- Scope: allow selected admin users to carry extra Sales or CS workspace access without changing their main `ADMIN` role.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260529093000_user_workspace_access/migration.sql`
  - `lib/auth.ts`
  - `lib/staff-roles.ts`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `app/admin/manager/users/page.tsx`
  - `tests/staff-roles.test.ts`
  - `docs/tasks/TASK-20260529-admin-extra-workspace-access.md`
- Risk impact (if any): Low to medium. This release adds a focused-workspace access table and seeds Eva with CS workspace access plus Jasmine/zhao hongwei with Sales workspace access, while leaving their main role as `ADMIN`. Pure `SALES` and `CS` role restrictions remain unchanged. Billing, packages, contracts, attendance, payroll, receipts, and scheduling logic are unchanged.
- Verification:
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx tsx --test tests/staff-roles.test.ts tests/leads.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-29-r159`.

---

## 2026-05-28-r158

- Release ID: `2026-05-28-r158`
- Date/Time (Asia/Shanghai): `2026-05-28`
- Deployment status: `READY`
- Scope: add independent `SALES` and `CS` roles with a scoped Resource Follow-up workspace instead of full admin access.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260528103000_add_sales_cs_roles/migration.sql`
  - `lib/auth.ts`
  - `lib/staff-roles.ts`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `app/admin/leads/*`
  - `app/admin/manager/users/*`
  - `tests/staff-roles.test.ts`
  - `docs/tasks/TASK-20260528-sales-cs-independent-roles.md`
- Risk impact (if any): Low to medium. This release adds new user roles and a scoped resource workspace. `requireAdmin()` remains restricted to existing admin/finance/manager access, while Sales/CS can only enter Resource Follow-up pages through resource-specific guards. Billing, packages, contracts, attendance, payroll, teacher portal, and finance workflows are unchanged.
- Verification:
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx tsx --test tests/staff-roles.test.ts tests/leads.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-28-r158`.

---

## 2026-05-28-r157

- Release ID: `2026-05-28-r157`
- Date/Time (Asia/Shanghai): `2026-05-28`
- Deployment status: `READY`
- Scope: fix the Resource Follow-up new resource form layout so the owner selector no longer overflows into the intent selector.
- Key files:
  - `app/admin/leads/new/page.tsx`
  - `docs/tasks/TASK-20260528-lead-new-form-layout-fix.md`
- Risk impact (if any): Low. This is a CSS/layout constraint fix on the new resource form only. It does not change resource creation logic, owner assignment, follow-up records, teacher assessment, student conversion, booking links, billing, contracts, packages, attendance, payroll, or OpenClaw behavior.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-05-28-r157`.

---

## 2026-05-28-r156

- Release ID: `2026-05-28-r156`
- Date/Time (Asia/Shanghai): `2026-05-28`
- Deployment status: `READY`
- Scope: finish the next Resource Follow-up CRM workflow gaps with quick list filters, matching CSV focus export, cancellable teacher assessments, and a Booking Link handoff after student conversion.
- Key files:
  - `lib/leads.ts`
  - `app/admin/leads/page.tsx`
  - `app/admin/leads/[id]/page.tsx`
  - `app/admin/leads/export/route.ts`
  - `app/admin/booking-links/page.tsx`
  - `app/admin/booking-links/_components/BookingLinkCreateForm.tsx`
  - `tests/leads.test.ts`
  - `docs/tasks/TASK-20260528-resource-followup-shortcuts-and-booking.md`
- Risk impact (if any): Low. This release only improves the new Resource Follow-up workflow and adds a prefilled handoff into the existing Booking Link page. It does not change booking-link creation APIs, scheduling availability logic, contracts, packages, invoices, receipts, payroll, attendance, or OpenClaw behavior.
- Verification:
  - `npx prisma validate`
  - `npx tsx --test tests/leads.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-28-r156`.

---

## 2026-05-28-r155

- Release ID: `2026-05-28-r155`
- Date/Time (Asia/Shanghai): `2026-05-28`
- Deployment status: `READY`
- Scope: enhance the Resource Follow-up CRM with an independent owner list, owner maintenance page, resource profile editing, archived-resource handling, My Resources filtering, and guarded test-resource deletion.
- Key files:
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
- Risk impact (if any): Low to medium. This release only extends the new CRM lead workflow. Archive is reversible, owner names are independent from login roles, and physical deletion is restricted to clearly marked `TEST` resources for the owner manager. Billing, package, contract, receipt, attendance, payroll, teacher cost, scheduling conflict, and OpenClaw logic are unchanged.
- Verification:
  - `npx prisma validate`
  - `npx prisma generate`
  - `npx tsx --test tests/leads.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-28-r155`.

---

## 2026-05-28-r154

- Release ID: `2026-05-28-r154`
- Date/Time (Asia/Shanghai): `2026-05-28`
- Deployment status: `READY`
- Scope: add the first Resource Follow-up CRM workflow for inquiry intake, sales follow-up, teacher assessments, student conversion, scheduling ticket handoff, dashboard metrics, and CSV export.
- Key files:
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
- Risk impact (if any): Medium. This release adds new CRM tables and routes, but it keeps billing, package, receipt, attendance, payroll, contract, and OpenClaw workflows unchanged. Student conversion only creates a Student and optional scheduling ticket after an admin action.
- Verification:
  - `npx prisma generate`
  - `npx tsx --test tests/leads.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-28-r154`.

---

## 2026-05-27-r153

- Release ID: `2026-05-27-r153`
- Date/Time (Asia/Shanghai): `2026-05-27`
- Deployment status: `READY`
- Scope: add a manager quality reflection history dashboard showing previous feedback, checklist completion rate, per-item completion, and an incomplete-only filter.
- Key files:
  - `app/admin/manager/quality/page.tsx`
  - `lib/manager-quality-workspace.ts`
  - `lib/manager-reflection-summary.ts`
  - `tests/manager-quality-workspace.test.ts`
  - `docs/tasks/TASK-20260527-manager-quality-history-dashboard.md`
- Risk impact (if any): Low. The dashboard reads existing manager reflection entries from `AppSetting` and does not change storage shape, approvals, scheduling, feedback submission, billing, payroll, or OpenClaw behavior.
- Verification:
  - `npx tsx --test tests/manager-quality-workspace.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-27-r153`.

---

## 2026-05-27-r152

- Release ID: `2026-05-27-r152`
- Date/Time (Asia/Shanghai): `2026-05-27`
- Deployment status: `READY`
- Scope: extend tutor payment profiles from PayNow-only to support bank-transfer collection details and export those bank fields for finance payout work.
- Key files:
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
  - `docs/tasks/TASK-20260527-tutor-bank-payment-profile.md`
- Risk impact (if any): Low to medium. Finance exports now include full bank account details in addition to full PayNow values, so generated files remain sensitive payout data. Amount calculations and approval workflows are unchanged.
- Verification:
  - `npx prisma generate`
  - `npx tsx --test tests/teacher-payment-profile.test.ts tests/tutor-cost-cutoff.test.ts tests/expense-claims.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-27-r152`.

---

## 2026-05-27-r151

- Release ID: `2026-05-27-r151`
- Date/Time (Asia/Shanghai): `2026-05-27`
- Deployment status: `READY`
- Scope: add stable tutor serial numbers and PayNow payment profiles, with finance export columns for tutor payroll and expense-claim reimbursements.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260527090000_add_teacher_payment_profile/migration.sql`
  - `lib/teacher-payment-profile.ts`
  - `app/admin/teachers/page.tsx`
  - `app/admin/teachers/[id]/page.tsx`
  - `app/admin/_components/TeacherCreateForm.tsx`
  - `app/teacher/payment-details/page.tsx`
  - `app/admin/reports/teacher-payroll/export/route.ts`
  - `app/api/exports/tutor-cost-cutoff/route.ts`
  - `app/api/exports/expense-claims/route.ts`
  - `tests/teacher-payment-profile.test.ts`
  - `docs/tasks/TASK-20260527-tutor-code-paynow-profile.md`
- Risk impact (if any): Low to medium. The migration backfills existing teachers with deterministic `T###` codes and exports full PayNow values for finance payout files. Payroll, tutor-cost, and expense amounts remain unchanged.
- Verification:
  - `npx prisma generate`
  - `npx tsx --test tests/teacher-payment-profile.test.ts`
  - `npx tsx --test tests/tutor-cost-cutoff.test.ts tests/expense-claims.test.ts tests/teacher-payment-profile.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-27-r151`.

---

## 2026-05-19-r150

- Release ID: `2026-05-19-r150`
- Date/Time (Asia/Shanghai): `2026-05-19`
- Deployment status: `READY`
- Scope: allow a manually expired New Oriental online partner package with forfeited remaining minutes to be settled by the full purchased package minutes.
- Key files:
  - `lib/partner-settlement.ts`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `tests/partner-settlement.test.ts`
  - `docs/tasks/TASK-20260519-xdf-online-partial-closeout.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. The new settlement candidate branch only applies to `ONLINE_PACKAGE_END` packages after the package status is `EXPIRED`; active incomplete packages still do not become settlement candidates. It does not change attendance deduction, scheduling, direct-billing invoices, receipts, payroll, or OpenClaw.
- Verification:
  - read-only production data check for 苏闻熹 before changes: one New Oriental online package, 900 total minutes, 810 deducted minutes, 90 remaining minutes, no future sessions, no existing settlements
  - `npx tsx --test tests/partner-settlement.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-19-r150`.

---

## 2026-05-17-r149

- Release ID: `2026-05-17-r149`
- Date/Time (Asia/Shanghai): `2026-05-17`
- Deployment status: `READY`
- Scope: allow renewal-contract creation to reuse complete parent information from a voided first-purchase intake contract.
- Key files:
  - `lib/student-contract.ts`
  - `tests/student-contract-renewal-invoice.test.ts`
  - `docs/tasks/TASK-20260517-renewal-parent-info-from-void-contract.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. The change only expands the statuses searched for reusable parent information to include voided contracts; incomplete parent information is still rejected by the existing parser. It does not change invoice creation, receipt handling, package balances, scheduling, or attendance.
- Verification:
  - `npx tsx --test tests/student-contract-renewal-invoice.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-17-r149`.

---

## 2026-05-16-r148

- Release ID: `2026-05-16-r148`
- Date/Time (Asia/Shanghai): `2026-05-16`
- Deployment status: `READY`
- Scope: allow renewal contracts on legacy direct-billing packages with multiple historical invoices to sign normally.
- Key files:
  - `lib/student-contract.ts`
  - `tests/student-contract-renewal-invoice.test.ts`
  - `docs/tasks/TASK-20260516-renewal-contract-historical-invoices.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. Renewal contracts now ignore unrelated historical package invoices when deciding whether signing can continue. First-purchase contracts still keep the existing multi-invoice ambiguity guard, so the system still avoids auto-linking the wrong old invoice for new purchase flows.
- Verification:
  - `npx tsx --test tests/student-contract-renewal-invoice.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-16-r148`.

---

## 2026-05-15-r147

- Release ID: `2026-05-15-r147`
- Date/Time (Asia/Shanghai): `2026-05-15`
- Deployment status: `READY`
- Scope: expose transport billing and related finance document links in the admin sidebar for manager/admin users.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260515-admin-sidebar-transport-billing.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. Navigation-only change for admin/manager sidebar visibility. It does not change transport invoice creation, receipts, payment records, attendance, package balances, payroll, scheduling, or permissions.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-05-15-r147`.

---

## 2026-05-15-r146

- Release ID: `2026-05-15-r146`
- Date/Time (Asia/Shanghai): `2026-05-15`
- Deployment status: `READY`
- Scope: add a finance transport reimbursement billing desk for parent invoices generated from held lessons.
- Key files:
  - `lib/transport-billing.ts`
  - `app/admin/finance/transport-billing/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/page.tsx`
  - `docs/tasks/TASK-20260515-transport-reimbursement-billing.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds a separate finance workflow and stores transport billing flags in AppSetting. It reuses existing parent invoice creation only after finance explicitly marks billable sessions and clicks create invoice. It does not change lesson scheduling, attendance deduction, package balances, teacher expense claims, payroll, partner settlement, receipts, or OpenClaw.
- Verification:
  - real-data read check for `2026-03`: 45 students and 394 held lesson rows available for review
  - `npm run build`
- Rollback point: previous production commit before `2026-05-15-r146`.

---

## 2026-05-15-r145

- Release ID: `2026-05-15-r145`
- Date/Time (Asia/Shanghai): `2026-05-15`
- Deployment status: `READY`
- Scope: stop treating academically confirmed historical orphan rollback reversals as active ledger-integrity alerts.
- Key files:
  - `scripts/reconciliation/daily-ledger-integrity.ts`
  - `docs/tasks/TASK-20260515-ledger-integrity-confirmed-exceptions.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This changes alert classification only: confirmed historical exceptions no longer appear as active red ledger mismatch alerts. It does not alter package transactions, attendance, balances, invoices, receipts, payroll, scheduling, or OpenClaw.
- Verification:
  - `npx tsx scripts/reconciliation/daily-ledger-integrity.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-15-r145`.

---

## 2026-05-13-r144

- Release ID: `2026-05-13-r144`
- Date/Time (Asia/Shanghai): `2026-05-13`
- Deployment status: `READY`
- Scope: tighten Manager Quality Desk printing so the Lead Desk printout is a one-page schedule only.
- Key files:
  - `app/admin/manager/quality/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. Print CSS and print-only markup only. It does not change schedule data, manager reflection data, reminders, attendance, payroll, billing, invoices, receipts, or package balances.
- Verification:
  - `npx tsc --noEmit`
  - `npm run build`
  - Playwright generated the local Lead Desk PDF as 1 page
  - PDF text check confirmed the printout includes Lead Desk schedule and excludes ledger alert, Todo Center links, reflection log, and quality snapshot
- Rollback point: previous production commit before `2026-05-13-r144`.

---

## 2026-05-13-r143

- Release ID: `2026-05-13-r143`
- Date/Time (Asia/Shanghai): `2026-05-13`
- Deployment status: `READY`
- Scope: add a manager quality workspace for Jasmine/manager users with printable Lead Desk schedule, daily workflow reflection log, and quality/KPI snapshots.
- Key files:
  - `lib/manager-quality-workspace.ts`
  - `app/admin/manager/quality/page.tsx`
  - `app/admin/manager/quality/_components/ManagerQualityPrintButton.tsx`
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260513-manager-quality-desk.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds a manager-only page and an AppSetting-backed daily reflection log. It does not send reminders, emails, OpenClaw messages, change scheduling, attendance deduction, payroll, billing, invoices, receipts, or report assignment workflows.
- Verification:
  - `npx tsc --noEmit`
  - `npm run build`
  - local authenticated HTTP check for `/admin/manager/quality?date=2026-05-13` returned `200`
  - Playwright confirmed Jasmine can see the left sidebar entry, Lead Desk rows, quality snapshot, and reflection form
  - Playwright submitted a local reflection log successfully; local QA entry and temporary auth session were removed afterwards
- Rollback point: previous production commit before `2026-05-13-r143`.

---

## 2026-05-13-r142

- Release ID: `2026-05-13-r142`
- Date/Time (Asia/Shanghai): `2026-05-13`
- Deployment status: `READY`
- Scope: add package-balance guardrails so academic/admin users can find balance drift and risky rollback or adjustment records before package deductions fail.
- Key files:
  - `lib/package-balance-audit.ts`
  - `app/admin/reports/package-balance-audit/page.tsx`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/admin/layout.tsx`
  - `app/admin/manager/quality/page.tsx`
  - `lib/manager-quality-workspace.ts`
  - `docs/tasks/TASK-20260513-package-balance-audit-guardrails.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. Package ledger edit endpoints now re-sync current remaining balance from ledger totals after manual ledger changes. This reduces balance drift but should be watched on abnormal package correction workflows.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-05-13-r142`.

---

## 2026-05-12-r141

- Release ID: `2026-05-12-r141`
- Date/Time (Asia/Shanghai): `2026-05-12`
- Deployment status: `READY`
- Scope: add a read-only finance/admin Excel report for weekly or monthly individual student utility.
- Key files:
  - `lib/individual-student-utility-report.ts`
  - `app/admin/finance/individual-student-utility/page.tsx`
  - `app/api/exports/individual-student-utility/route.ts`
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260512-individual-student-utility-report.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a read-only attendance/session/package export and navigation entry. It does not change reminders, OpenClaw, package deduction, scheduling, invoices, receipts, payroll, or approval workflows.
- Verification:
  - real-data helper check for `2026-04`: 20 students, 227 lessons, 399.25 deducted hours
  - `npx tsc --noEmit`
  - `npm run build`
  - local authenticated HTTP check for page and Excel export returned `200`
  - exported workbook opened with `Student Summary` and `Utility Detail` sheets
- Rollback point: previous production commit before `2026-05-12-r141`.

---

## 2026-05-09-r140

- Release ID: `2026-05-09-r140`
- Date/Time (Asia/Shanghai): `2026-05-09`
- Deployment status: `READY`
- Scope: add the tutor cost export to admin and finance left navigation and allow FINANCE role access.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260509-finance-tutor-cost-sidebar-entry.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. Navigation and route access only for an existing read-only finance export page. It does not change export calculations, payroll writes, approvals, scheduling, attendance, billing, package balances, or expense claims.
- Verification:
  - `npx tsc --noEmit`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-09-r140`.

---

## 2026-05-09-r139

- Release ID: `2026-05-09-r139`
- Date/Time (Asia/Shanghai): `2026-05-09`
- Deployment status: `READY`
- Scope: add a finance self-service Excel export for tutor cost from the 15th to month-end.
- Key files:
  - `lib/teacher-payroll.ts`
  - `app/admin/finance/tutor-cost-export/page.tsx`
  - `app/api/exports/tutor-cost-cutoff/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `tests/tutor-cost-cutoff.test.ts`
  - `docs/tasks/TASK-20260509-finance-tutor-cost-cutoff-export.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This is a read-only finance export based on existing payroll completion and teacher-rate logic. It does not create, edit, approve, or pay payroll records, and it does not change scheduling, attendance, package balances, invoices, receipts, or expense claims.
- Verification:
  - `npx tsx --test tests/tutor-cost-cutoff.test.ts`
  - `npx tsc --noEmit`
  - local route compiled via `/admin/finance/tutor-cost-export`
- Rollback point: previous production commit before `2026-05-09-r139`.

---

## 2026-05-08-r138

- Release ID: `2026-05-08-r138`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: improve shared mobile usability for admin and teacher workspaces.
- Key files:
  - `app/responsive-layout.css`
  - `docs/tasks/TASK-20260508-mobile-usability-global-pass.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This is a CSS-only responsive pass for small screens; it does not change business logic, data writes, permissions, billing, attendance, scheduling, or finance calculations.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-05-08-r138`.

---

## 2026-05-08-r137

- Release ID: `2026-05-08-r137`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: move the teacher notice admin entry higher in the left navigation so admins and finance users can find it immediately.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260508-teacher-notice-nav-placement.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. Navigation placement only. It does not change notice data, scheduling, attendance, payroll, expense claims, billing, packages, student data, or OpenClaw.
- Verification:
  - `npm run build`
- Rollback point: previous production commit before `2026-05-08-r137`.

---

## 2026-05-08-r136

- Release ID: `2026-05-08-r136`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: upgrade teacher notices into a manageable notice center with admin publishing, categories, expiry dates, required acknowledgement, and read/unread tracking.
- Key files:
  - `app/admin/teacher-notices/page.tsx`
  - `app/admin/layout.tsx`
  - `app/teacher/page.tsx`
  - `app/teacher/notices/page.tsx`
  - `lib/teacher-notices.ts`
  - `tests/teacher-notices.test.ts`
  - `docs/tasks/TASK-20260508-teacher-notice-center-admin.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds admin publishing and notice acknowledgement workflow only. It does not change scheduling, attendance, payroll calculation, expense-claim submission, invoices, receipts, package balances, student data, or OpenClaw.
- Verification:
  - `npx tsx --test tests/teacher-notices.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-08-r136`.

---

## 2026-05-08-r135

- Release ID: `2026-05-08-r135`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: add teacher-facing notices so the company-name update can be shown inside the SGT Manage teacher portal.
- Key files:
  - `app/teacher/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/notices/page.tsx`
  - `app/teacher/TeacherNoticeCardClient.tsx`
  - `app/api/teacher/notices/read/route.ts`
  - `lib/teacher-notices.ts`
  - `tests/teacher-notices.test.ts`
  - `docs/tasks/TASK-20260508-teacher-company-name-notice.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This adds a teacher portal notice and read tracking only. It does not change scheduling, attendance, payroll calculation, expense-claim submission, invoices, receipts, package balances, student data, or OpenClaw.
- Verification:
  - confirmed no existing `teacher_notices_v1` or `teacher_notice_reads_v1` AppSetting rows would be overwritten
  - `npx tsx --test tests/teacher-notices.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-08-r135`.

---

## 2026-05-08-r134

- Release ID: `2026-05-08-r134`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: fix package-ledger PDF export minute formatting so negative 90-minute deductions display as `-1h 30m` instead of `-2h 30m`.
- Key files:
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `lib/package-ledger-format.ts`
  - `tests/package-ledger-format.test.ts`
  - `docs/tasks/TASK-20260508-package-ledger-pdf-negative-minutes.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes display formatting only for package-ledger hour values. It does not edit package transactions, balances, attendance, scheduling, billing, settlements, payroll, expense claims, or OpenClaw.
- Verification:
  - queried the real Dong Xinyi AEIS package ledger and confirmed each deduction is stored as `-90` minutes while balances decrease by 1h30m
  - extracted the uploaded PDF and confirmed the visible delta text was inconsistent with the running balance
  - `npx tsx --test tests/package-ledger-format.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-05-08-r134`.

---

## 2026-05-08-r133

- Release ID: `2026-05-08-r133`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: update exported finance/legal document company name to GT Educational Institute Pte. Ltd. and switch sealed partner exports to the GT education seal.
- Key files:
  - `app/api/exports/parent-invoice/[id]/route.ts`
  - `app/api/exports/parent-receipt/[id]/route.ts`
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `app/api/exports/partner-receipt/[id]/route.ts`
  - `app/api/exports/partner-invoice-detail/[id]/route.ts`
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `app/api/exports/student-detail/[id]/route.ts`
  - `app/api/exports/student-schedule/[id]/route.ts`
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `app/admin/enrollments/export/pdf/route.ts`
  - `lib/student-contract-template.ts`
  - `docs/tasks/TASK-20260508-company-name-and-seal-update.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes displayed company/legal name and seal image only. It does not change invoice numbers, receipt numbers, totals, approvals, payment status, billing records, package deduction, scheduling, attendance, payroll, settlement, expense claims, or OpenClaw.
- Verification:
  - confirmed uploaded invoice and receipt templates already show `GT Educational Institute Pte. Ltd.` in visible cells
  - scanned app/lib exports so the old company name no longer appears in system document generation code
  - confirmed sealed partner invoice/detail exports now reference `public/gt_edu_seal.png`
  - `npx tsc --noEmit`
  - `npx next build`
- Rollback point: previous production commit before `2026-05-08-r133`.

---

## 2026-05-08-r132

- Release ID: `2026-05-08-r132`
- Date/Time (Asia/Shanghai): `2026-05-08`
- Deployment status: `READY`
- Scope: add payment status, period filters, and Excel export to the finance document center.
- Key files:
  - `app/admin/finance/documents/page.tsx`
  - `app/api/exports/finance-documents/route.ts`
  - `lib/finance-documents.ts`
  - `tests/finance-documents.test.ts`
  - `docs/tasks/TASK-20260508-finance-documents-payment-status-export.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This changes finance document visibility and export reporting only. It does not create, approve, reject, mark paid, archive, or delete invoices/receipts, and does not change student billing, package deduction, scheduling, attendance, contracts, partner settlement, payroll, expense claims, or OpenClaw.
- Verification:
  - queried real invoice rows with the new status logic: 25 invoices total; paid 15, partial 1, unpaid 8, rejected 1
  - `npx tsx --test tests/finance-documents.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
- Rollback point: previous production commit before `2026-05-08-r132`.

---

## 2026-05-07-r131

- Release ID: `2026-05-07-r131`
- Date/Time (Asia/Shanghai): `2026-05-07`
- Deployment status: `READY`
- Scope: add an all-paid expense-claims view that includes both active and archived paid claims.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `app/api/exports/expense-claims/route.ts`
  - `lib/expense-claims.ts`
  - `tests/expense-claims.test.ts`
  - `docs/tasks/TASK-20260507-expense-claims-all-paid-archive-view.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes finance expense-claim filtering and CSV export only. It does not change claim approval, payment marking, attachment storage, payroll, student billing, package deduction, scheduling, attendance, contracts, partner settlement, or OpenClaw.
- Verification:
  - queried real paid expense claims: 41 active, 1 archived, 42 total
  - `npx tsx --test tests/expense-claims.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
- Rollback point: previous production commit before `2026-05-07-r131`.

---

## 2026-04-29-r130

- Release ID: `2026-04-29-r130`
- Date/Time (Asia/Shanghai): `2026-04-29`
- Deployment status: `READY`
- Scope: clarify quick-schedule student time conflicts so existing-session room labels are not mistaken for selected-room occupancy.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `lib/quick-schedule-messages.ts`
  - `tests/quick-schedule-messages.test.ts`
  - `docs/tasks/TASK-20260429-quick-schedule-student-conflict-room-wording.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes quick-schedule conflict wording only. It does not change room selection, room conflict detection, teacher availability, scheduling writes, attendance, package deduction, billing, contracts, payroll, settlement, or OpenClaw.
- Verification:
  - checked the reported real window: `2026-05-14 17:30-19:00`, Orchard Plaza `Room 3` has no overlapping session
  - confirmed the shown `Room 1` row is an existing overlapping student session at `18:00-19:30`, not selected-room occupancy
  - `npx tsx --test tests/quick-schedule-messages.test.ts tests/quick-schedule-execution.test.ts tests/availability-conflict.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
- Rollback point: previous production commit before `2026-04-29-r130`.

---

## 2026-04-25-r129

- Release ID: `2026-04-25-r129`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: make Todo Center academic-management lane switching instant and align lane counts with visible alert rows.
- Key files:
  - `app/admin/todos/page.tsx`
  - `app/admin/todos/AcademicManagementAlertsClient.tsx`
  - `docs/tasks/TASK-20260425-todo-academic-alert-filter-counts.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes the Todo Center academic-management alert UI only. It does not change OpenClaw, student records, package settlement, scheduling, attendance, package deduction, partner settlement, contracts, payroll, or finance approval logic.
- Verification:
  - confirmed the old section mixed active-student counts with alert-row counts and capped alert rows at 20
  - scanned Todo Center for remaining `todoHref` lane links; only pagination and lazy conflict-load links remain
  - `npx tsx --test tests/academic-management.test.ts tests/parent-feedback-quality.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
- Rollback point: previous production commit before `2026-04-25-r129`.

---

## 2026-04-25-r128

- Release ID: `2026-04-25-r128`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: correct academic management lane logic so own/partner grouping follows the student type, not the package settlement mode.
- Key files:
  - `lib/academic-management.ts`
  - `tests/academic-management.test.ts`
  - `app/admin/todos/page.tsx`
  - `app/admin/reports/academic-management/page.tsx`
  - `docs/tasks/TASK-20260425-academic-management-student-type-lanes.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes academic management filtering and warning labels only. It does not change package settlement mode, student type records, OpenClaw, scheduling, attendance, package deduction, partner settlement, contracts, payroll, or finance approval logic.
- Verification:
  - queried active-package students by the corrected student-type rule: 17 own, 29 partner, 4 unclassified
  - confirmed the 4 warning rows are students with missing student type: 张磊, lily, 邵楚然, 李东恒
  - `npx tsx --test tests/academic-management.test.ts tests/parent-feedback-quality.test.ts`
  - `npx tsc --noEmit`
  - `npx next build`
- Rollback point: previous production commit before `2026-04-25-r128`.

---

## 2026-04-25-r127

- Release ID: `2026-04-25-r127`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: split academic management views between own/direct students and partner students.
- Key files:
  - `lib/academic-management.ts`
  - `tests/academic-management.test.ts`
  - `app/admin/todos/page.tsx`
  - `app/admin/reports/academic-management/page.tsx`
  - `docs/tasks/TASK-20260425-academic-management-own-vs-partner.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This adds filtering and labels to academic management views only. It does not change package settlement mode, student type records, OpenClaw, scheduling, attendance, package deduction, partner settlement, contracts, payroll, or finance approval logic.
- Verification:
  - queried production data: 77 students, 51 active hour packages with remaining balance, 19 direct/own active packages, 32 partner active packages
  - confirmed student types include `合作方学生`, `自己学生-新生`, `自己学生-留学+课程`, and legacy `直客学生`
  - `npx tsx --test tests/academic-management.test.ts tests/parent-feedback-quality.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r127`.

## 2026-04-25-r126

- Release ID: `2026-04-25-r126`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: improve the non-OpenClaw academic management workflow with service-plan presets, profile completeness, feedback quality checks, Todo Center alert expansion, and a monthly academic management report.
- Key files:
  - `lib/academic-management.ts`
  - `lib/parent-feedback-quality.ts`
  - `tests/parent-feedback-quality.test.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/reports/academic-management/page.tsx`
  - `app/admin/layout.tsx`
  - `docs/tasks/TASK-20260425-academic-management-followups.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds read-only reporting and visible quality/completeness signals, plus changes the student service-plan input from free text to presets. It does not change OpenClaw, scheduling creation, attendance, package deduction, payroll, or finance approval logic.
- Verification:
  - queried production data: 77 students, 67 active hour packages, 64 active-package students, 39 active-package students without a session in the next 14 days
  - confirmed current academic management profile data is still empty before operators classify students
  - `npx tsx --test tests/parent-feedback-quality.test.ts`
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r126`.

## 2026-04-25-r125

- Release ID: `2026-04-25-r125`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: add student academic management fields, student-detail profile display, Todo Center alerts for active-package students without upcoming lessons, and a documentation-only OpenClaw reminder plan.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260425143000_add_student_academic_management_fields/migration.sql`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `app/admin/todos/page.tsx`
  - `app/api/admin/students/route.ts`
  - `app/api/admin/students/[id]/route.ts`
  - `docs/OpenClaw-学业管理提醒方案-暂存.md`
  - `docs/tasks/TASK-20260425-student-academic-management-reminders.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This adds nullable student profile columns and a Todo Center read path. It does not change OpenClaw runtime, scheduling creation, attendance, package deduction, payroll, or finance approval logic.
- Verification:
  - queried production data: 77 students, 50 active-package students, 28 active-package students without a lesson in the next 14 days
  - confirmed current academic management fields are empty until operators populate them
  - confirmed the existing parent-facing feedback template already has five required sections and missing-section validation
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r125`.

## 2026-04-25-r124

- Release ID: `2026-04-25-r124`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: add a parent-readable WeChat copy format for admin teacher-feedback forwarding while keeping the existing internal record copy.
- Key files:
  - `lib/feedback-forward-text.ts`
  - `app/admin/feedbacks/page.tsx`
  - `docs/tasks/TASK-20260425-admin-feedback-wechat-copy.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes copied text and preview on the admin feedback forwarding page; it does not change teacher feedback submission, forwarded status, attendance, payroll, homework storage, or database schema.
- Verification:
  - tested WeChat text generation against real recent structured parent-facing feedback
  - tested fallback formatting against old unstructured feedback
  - verified the admin feedback page now shows a WeChat preview and separate WeChat/internal copy buttons
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r124`.

## 2026-04-25-r123

- Release ID: `2026-04-25-r123`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: replace the parent-facing teacher feedback editable template with five separate answer boxes, external bilingual prompts, examples, and an automatic parent-facing preview.
- Key files:
  - `lib/parent-feedback-format.ts`
  - `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/api/teacher/sessions/[id]/feedback/route.ts`
  - `docs/SOP-老师端操作流程图文-20260425.md`
  - `docs/assets/teacher-sop-20260425/04-parent-feedback-form.png`
  - `docs/tasks/TASK-20260425-teacher-feedback-section-inputs.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This changes the teacher feedback writing UI and submit payload, but stores the assembled result in the same existing fields and does not change attendance, payroll, forwarding queues, homework, or database schema.
- Verification:
  - tested helper parsing for old Chinese headings, bilingual headings, and unstructured legacy feedback
  - tested empty section values return all five missing labels
  - verified the real teacher feedback page renders five separate answer boxes and a preview
  - refreshed the SOP feedback-form screenshot
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r123`.

## 2026-04-25-r122

- Release ID: `2026-04-25-r122`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: make the parent-facing teacher feedback template bilingual, with English/Chinese section headings and English/Chinese hints for every required section.
- Key files:
  - `lib/parent-feedback-format.ts`
  - `app/teacher/sessions/[id]/page.tsx`
  - `docs/SOP-老师端操作流程图文-20260425.md`
  - `docs/assets/teacher-sop-20260425/04-parent-feedback-form.png`
  - `docs/tasks/TASK-20260425-teacher-feedback-bilingual-prompts.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This changes teacher-facing template wording and validation labels, while keeping the existing feedback storage fields, attendance logic, payroll eligibility, forwarding queues, and database schema unchanged.
- Verification:
  - tested empty bilingual template returns all five missing sections
  - tested English-filled and Chinese-filled feedback both pass section validation
  - verified the real teacher feedback page renders the bilingual template
  - refreshed the SOP feedback-form screenshot
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r122`.

## 2026-04-25-r121

- Release ID: `2026-04-25-r121`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: make teacher after-class feedback submit as a parent-facing progress note with required sections for lesson focus, current finding, class evidence, next plan, and parent note.
- Key files:
  - `lib/parent-feedback-format.ts`
  - `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/api/teacher/sessions/[id]/feedback/route.ts`
  - `docs/tasks/TASK-20260425-parent-facing-teacher-feedback.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This changes teacher feedback submission requirements and the text copied by admins to parents, but keeps the existing database fields and does not change attendance, payroll, overdue queue, or forwarding status logic.
- Verification:
  - inspected recent real `SessionFeedback` rows and confirmed many entries are teacher-log style
  - added shared client/server validation for the five parent-facing sections
  - tested complete and incomplete parent-facing feedback samples through the shared formatter
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r121`.

## 2026-04-25-r120

- Release ID: `2026-04-25-r120`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: sweep logged-in admin mobile layouts so common grid/flex containers no longer force page-level horizontal scrolling, and let the teacher payroll work area collapse to one column on phones.
- Key files:
  - `app/responsive-layout.css`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `docs/tasks/TASK-20260425-admin-mobile-post-login-layout-sweep.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This is UI-only and mobile-focused, but it touches the shared logged-in responsive layout. It does not change student, scheduling, finance, payroll, approval, or attachment data logic.
- Verification:
  - queried real admin, student, package, teacher, and ticket records for representative logged-in routes
  - local Playwright mobile viewport `390x844`
  - verified 17 logged-in admin routes have `overflowX=0` and no oversized sticky/fixed panels
  - verified the mobile admin menu opens with `overflowX=0`
  - `npm run build`
- Rollback point: previous production commit before `2026-04-25-r120`.

## 2026-04-25-r119

- Release ID: `2026-04-25-r119`
- Date/Time (Asia/Shanghai): `2026-04-25`
- Deployment status: `READY`
- Scope: fix the mobile student detail page so the large student workbench no longer stays sticky and covers the screen; keep only a compact horizontal shortcut row sticky on phones.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260425-student-mobile-sticky-workbench-fix.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is UI-only and only changes sticky guard presentation. It does not change student records, scheduling, attendance, package, contract, or finance behavior.
- Verification:
  - `npm run build`
  - local Playwright mobile viewport `390x844` on real student `王艺晨`
  - verified `#student-workbench-bar` becomes `position: static` with `data-workbench-sticky-guard="downgraded"`
  - verified the generated phone shortcut row is `56px` high with horizontal scrolling
  - verified scrolling leaves the large workbench behind while page content remains visible below the compact sticky row
- Rollback point: previous production commit before `2026-04-25-r119`.

## 2026-04-24-r112

- Release ID: `2026-04-24-r112`
- Date/Time (Asia/Shanghai): `2026-04-24`
- Deployment status: `READY`
- Scope: let only `zhao hongwei` delete mistaken parent-intake links from the student list, and only when the link has never been used to create a student, package, or contract.
- Key files:
  - `lib/student-parent-intake.ts`
  - `app/admin/students/page.tsx`
  - `docs/tasks/TASK-20260424-owner-delete-unused-parent-intake-links.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This adds a tightly scoped delete action for mistaken intake links only. Submitted or already-used links remain preserved in history and cannot be deleted.
- Verification:
  - `npm run build`
  - verify only `zhaohongwei0880@gmail.com` sees `Delete link / 删除链接`
  - verify an unused `LINK_SENT` intake can be deleted
  - verify submitted or contract-ready intakes do not show delete and cannot be deleted through the server action
  - verify used parent-intake links now live under `Used link history / 已使用链接历史` instead of occupying the main active list
- Rollback point: previous production commit before `2026-04-24-r112`.

## 2026-04-24-r111

- Release ID: `2026-04-24-r111`
- Date/Time (Asia/Shanghai): `2026-04-24`
- Deployment status: `READY`
- Scope: stop invoice-number compaction after draft deletion so only month-end tail holes can be reused naturally, and add visible deleted-draft history for parent and partner billing pages.
- Key files:
  - `lib/global-invoice-sequence.ts`
  - `lib/student-parent-billing.ts`
  - `lib/partner-billing.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/admin/packages/route.ts`
  - `docs/tasks/TASK-20260424-invoice-delete-tail-gap-and-history.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. Invoice numbering behavior changes for draft deletion only. Existing issued/remaining invoice numbers are preserved instead of being compacted, and deleted draft numbers are now kept in visible history.
- Verification:
  - `npm run build`
  - confirm deleting a middle draft leaves the gap and does not renumber later invoices
  - confirm deleting the current tail draft lets the next new invoice reuse that tail slot naturally
  - confirm package billing, contract workspace, and partner billing show deleted draft invoice history
- Rollback point: previous production commit before `2026-04-24-r111`.

## 2026-04-24-r103

- Release ID: `2026-04-24-r103`
- Date/Time (Asia/Shanghai): `2026-04-24`
- Deployment status: `READY`
- Scope: move the heavy student-contract workspace out of package billing into its own package contract page, and leave a lighter contract summary/entry point inside billing.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/packages/[id]/contract/page.tsx`
  - `docs/tasks/TASK-20260424-package-contract-workspace-page.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This changes admin navigation and where contract actions live, but does not change contract state rules, invoice creation, signed PDFs, or partner-settlement exclusions.
- Verification:
  - `npm run build`
  - verify package billing now shows a compact contract summary with `Open contract workspace`
  - verify `/admin/packages/[id]/contract` contains parent-link, draft, sign-link, replacement, and void-history actions
- Rollback point: previous production commit before `2026-04-24-r103`.

## 2026-04-24-r102

- Release ID: `2026-04-24-r102`
- Date/Time (Asia/Shanghai): `2026-04-24`
- Deployment status: `READY`
- Scope: fix the public handwritten-signature pad so a parent who draws and immediately clicks submit no longer gets bounced back as if no signature was provided.
- Key files:
  - `app/contract/_components/ContractSignaturePad.tsx`
  - `docs/tasks/TASK-20260424-contract-signature-pad-submit-sync.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This only changes how the client-side sign pad syncs its hidden signature payload during drawing; it does not change contract wording, signed PDF generation, invoice creation, or package balance rules.
- Verification:
  - `npm run build`
  - verify drawing a signature and immediately clicking `Sign contract` now submits successfully instead of returning `Please draw the handwritten signature`
  - verify clearing the signature still empties the hidden signature payload
- Rollback point: previous production commit before `2026-04-24-r102`.

## 2026-04-23-r93

- Release ID: `2026-04-23-r93`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: let finance/ops delete disposable void contract drafts while moving all void contracts into collapsed history so old void rows no longer clutter or block the package billing contract workspace.
- Key files:
  - `lib/student-contract.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/tasks/TASK-20260423-contract-void-draft-delete-and-history.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This change only affects contract cleanup and display. Signed or invoiced void contracts remain preserved as history, and renewal contracts follow the same safe-delete rule.
- Verification:
  - `npm run build`
  - create a direct-billing contract draft, void it, then delete it and confirm the package returns to the normal create-contract state
  - confirm `VOID` contracts that were signed or invoiced stay in collapsed history and do not show a delete action
- Rollback point: previous production commit before `2026-04-23-r93`.

## 2026-04-23-r92

- Release ID: `2026-04-23-r92`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: unify direct-billing student-type semantics so the new parent-intake flow reuses the existing `自己学生-*` taxonomy instead of creating a separate `直客学生` branch, while direct-billing exports continue to recognize both names.
- Key files:
  - `lib/student-type-semantics.ts`
  - `lib/student-parent-intake.ts`
  - `app/api/exports/student-detail/[id]/route.ts`
  - `app/api/exports/student-schedule/[id]/route.ts`
  - `app/api/exports/package-ledger/[id]/route.ts`
  - `docs/tasks/TASK-20260423-student-type-direct-billing-alias.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This change does not alter contract, invoice, receipt, package, or scheduling rules. It only normalizes which student type new direct-billing intake students receive and keeps export branding logic consistent across old and new labels.
- Verification:
  - query current student types and confirm direct-billing labels were split across `直客学生` and `自己学生-*`
  - create a fresh parent-intake submission and confirm the new student now lands on `自己学生-新生`
  - `npm run build`
  - verify student detail, student schedule, and package ledger exports now treat both `自己学生-*` and `直客学生` as direct-billing student types
- Rollback point: previous production commit before `2026-04-23-r92`.

## 2026-04-23-r91

- Release ID: `2026-04-23-r91`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: rework the direct-billing student contract flow so first purchases can start from a parent intake link before a student exists, renewals skip intake, and signed contracts automatically create the matching invoice draft.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260423154500_student_contract_flow_rework/migration.sql`
  - `prisma/migrations/20260423181500_add_student_parent_intakes/migration.sql`
  - `lib/student-contract.ts`
  - `lib/student-parent-intake.ts`
  - `lib/student-contract-template.ts`
  - `app/admin/students/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/student-intake/[token]/page.tsx`
  - `app/contract-intake/[token]/page.tsx`
  - `app/contract/[token]/page.tsx`
  - `app/api/exports/student-contract/[id]/route.ts`
  - `docs/tasks/TASK-20260423-student-contract-intake-renewal-auto-invoice.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This release adds a new pre-student parent-intake path, changes student-contract status progression, adds renewal-mode branching, and auto-creates invoice drafts after signing. It does not change partner-settlement package handling, receipt rules, scheduling gates, or finance-gate rules.
- Verification:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
  - local new-student QA confirmed `intake link -> parent submit -> student created -> first package setup -> ready to sign -> signed -> invoice created`
  - local renewal QA confirmed `renewal draft reuses parent info -> ready to sign -> signed -> invoice created`
  - verify first-purchase signing auto-created invoice `RGT-202604-0017`
  - verify renewal signing auto-created invoice `RGT-202604-0018`
  - verify renewal package finance gate moved to `INVOICE_PENDING_MANAGER`
  - verify QA cleanup removed the temporary test students, intakes, packages, contracts, approvals, and generated invoice drafts afterwards
- Rollback point: previous production commit before `2026-04-23-r91`.

## 2026-04-23-r90

- Release ID: `2026-04-23-r90`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: fix contradictory contract UI on partner-settlement packages so exempt packages no longer show student-contract creation entry points.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260423-partner-package-contract-ui-guard.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI consistency fix only. It does not change settlement mode, finance-gate status, partner billing logic, contract records, or any scheduling and finance workflow.
- Verification:
  - `npm run build`
  - confirm partner-settlement packages no longer show `Create contract draft` or `Create from package billing`
  - confirm the same pages now explain that partner-settlement packages stay outside the student contract workflow
- Rollback point: previous production commit before `2026-04-23-r90`.

## 2026-04-23-r89

- Release ID: `2026-04-23-r89`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: fix the new student contract PDF layout so long bilingual header text and summary values no longer overlap in downloaded contracts.
- Key files:
  - `lib/student-contract-pdf.ts`
  - `docs/tasks/TASK-20260423-student-contract-pdf-overlap-fix.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a layout-only follow-up for the student contract PDF. It does not change contract statuses, contract tokens, signing rules, file storage, package billing logic, invoice gates, or any scheduling workflow.
- Verification:
  - `npm run build`
  - generate a real student contract PDF and confirm the header title no longer collides with the company lines
  - confirm long student/course/package summary values no longer overlap inside the summary box
- Rollback point: previous production commit before `2026-04-23-r89`.

## 2026-04-23-r88

- Release ID: `2026-04-23-r88`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: add the first student-contract workflow for direct-billing packages, covering admin draft creation, parent intake, formal signing, and signed PDF export.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260423113000_add_student_contracts_phase1/migration.sql`
  - `lib/business-file-storage.ts`
  - `lib/student-contract-template.ts`
  - `lib/student-contract-pdf.ts`
  - `lib/student-contract.ts`
  - `app/contract/_components/ContractSignaturePad.tsx`
  - `app/contract-intake/[token]/page.tsx`
  - `app/contract/[token]/page.tsx`
  - `app/api/exports/student-contract/[id]/route.ts`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260423-student-contract-phase-1.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This release adds new public token flows, new Prisma tables, and contract PDF generation/storage. It does not change partner-settlement flows, invoice/receipt logic, scheduling logic, or existing package balances.
- Verification:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
  - library-level contract flow QA now passes through `create draft -> intake submit -> sign -> signed PDF saved`
  - browser QA now passes through `package billing -> intake link -> sign page -> signed success -> signed PDF download`
  - QA evidence captured in `tmp/qa-student-contract-flow-real-sign/`
- Rollback point: previous production commit before `2026-04-23-r88`.

## 2026-04-23-r87

- Release ID: `2026-04-23-r87`
- Date/Time (Asia/Shanghai): `2026-04-23`
- Deployment status: `READY`
- Scope: fix the parent statement PDF header so the bilingual statement title no longer overlaps the company name and generated-date lines when the title wraps.
- Key files:
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `docs/tasks/TASK-20260423-parent-statement-header-overlap-fix.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This changes only header layout in the parent statement PDF export. It does not affect statement totals, package status logic, invoice/receipt data, numbering, or any scheduling and finance workflows.
- Verification:
  - `npm run build`
  - export a parent statement PDF and confirm the top-right header block no longer overlaps
- Rollback point: previous production commit before `2026-04-23-r87`.

## 2026-04-21-r86

- Release ID: `2026-04-21-r86`
- Date/Time (Asia/Shanghai): `2026-04-21`
- Deployment status: `READY`
- Scope: turn the direct-billing package invoice gate into a real hard scheduling gate by removing the remaining finance-gate bypass paths from scheduling entry points.
- Key files:
  - `app/api/admin/enrollments/route.ts`
  - `app/api/admin/classes/[id]/sessions/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`
  - `app/api/admin/teachers/[id]/generate-sessions/route.ts`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/classes/[id]/sessions/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/tasks/TASK-20260421-direct-billing-invoice-gate-phase-3-hard-block.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium to high. This release removes the remaining soft-bypass path for `PACKAGE_FINANCE_GATE_BLOCKED`, so direct-billing chargeable packages that have not passed manager invoice approval will now be blocked consistently across scheduling APIs. Partner-settlement packages remain excluded, receipt is still not the first scheduling gate, and super admins still retain unrelated availability/admin powers but no longer bypass the finance gate itself.
- Verification:
  - `npm run build`
  - `npm run test:backend`
  - confirm no remaining runtime code paths bypass `PACKAGE_FINANCE_GATE_BLOCKED`
  - post-deploy: smoke-test quick schedule, enrollments, class session create/generate/reschedule, booking approval, teacher generate sessions, and ops execute against a pending direct-billing package
- Rollback point: previous production commit before `2026-04-21-r86`.

## 2026-04-21-r85

- Release ID: `2026-04-21-r85`
- Date/Time (Asia/Shanghai): `2026-04-21`
- Deployment status: `READY`
- Scope: ship Phase 1 and Phase 2 of the direct-billing package invoice gate so new direct-billing chargeable packages auto-create invoice drafts, enter manager approval, and soft-block scheduling flows until approval is complete.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260421183000_add_package_invoice_gate_phase1/migration.sql`
  - `lib/package-finance-gate.ts`
  - `lib/scheduling-package.ts`
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/enrollments/route.ts`
  - `app/api/admin/classes/[id]/sessions/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/booking-links/[id]/requests/[requestId]/approve/route.ts`
  - `app/api/admin/teachers/[id]/generate-sessions/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/approvals/page.tsx`
  - `app/admin/classes/[id]/ClassEnrollmentsClient.tsx`
  - `app/admin/classes/[id]/sessions/page.tsx`
  - `app/admin/enrollments/page.tsx`
  - `docs/tasks/TASK-20260421-direct-billing-invoice-gate-phase-1-and-2-release.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Medium. This release adds a new scheduling gate for direct-billing chargeable packages and touches multiple scheduling entry points. The main guardrails are that partner-settlement packages remain excluded, receipt is still not the first scheduling gate, and strict super admins can still bypass `PACKAGE_FINANCE_GATE_BLOCKED` during the soft-block phase. Migration order matters because the new code depends on the new `CoursePackage` finance-gate columns and `PackageInvoiceApproval` table.
- Verification:
  - `npx prisma migrate deploy` using the direct database URL, then verify the new `CoursePackage.financeGate*` columns and `PackageInvoiceApproval` table exist
  - `npm run build`
  - real-flow QA:
    - create a new direct-billing chargeable package
    - confirm invoice draft and `PackageInvoiceApproval` are auto-created
    - confirm package starts at `INVOICE_PENDING_MANAGER`
    - confirm scheduling decision returns `PACKAGE_FINANCE_GATE_BLOCKED` before manager approval
    - approve with a configured manager approver and confirm package becomes `SCHEDULABLE`
    - confirm partner-settlement package remains `EXEMPT`
  - UI QA artifacts captured under `tmp/qa-package-gate/`
- Rollback point: previous production commit before `2026-04-21-r85`.

## 2026-04-21-r84

- Release ID: `2026-04-21-r84`
- Date/Time (Asia/Shanghai): `2026-04-21`
- Deployment status: `READY`
- Scope: add a finance reconciliation workbook that lists every package created since SGT Manage went live and joins package, invoice, receipt, and payment-proof data for finance matching.
- Key files:
  - `lib/package-finance-reconciliation.ts`
  - `app/api/exports/package-finance-reconciliation/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/tasks/TASK-20260421-package-finance-reconciliation-report.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a read-only reporting export plus finance page links. It does not change package balances, package deduction, invoice numbering, receipt approval, or any scheduling workflow. The main caution is interpretation of historical mismatches, so the workbook exposes amount-basis source and exception rows instead of trying to silently normalize old data.
- Verification:
  - `npm run build`
  - confirm `/api/exports/package-finance-reconciliation` is present in the compiled route list
  - confirm finance workbench and student package invoice pages expose direct download links for the workbook
  - server-side follow-up after deploy: verify the workbook downloads and contains populated master / invoice / receipt-proof / exception sheets when production data exists
- Rollback point: previous production commit before `2026-04-21-r84`.

## 2026-04-17-r83

- Release ID: `2026-04-17-r83`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: tighten shared time-input sync and make quick-schedule conflict copy prioritize the student's own existing session before generic teacher/room blockers.
- Key files:
  - `app/_components/BlurTimeInput.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `lib/session-conflict.ts`
  - `tests/session-conflict.test.ts`
  - `docs/tasks/TASK-20260417-time-input-sync-and-quick-schedule-conflict-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low to medium. This change touches a shared time input and shared quick-schedule conflict messaging paths, but it does not alter teacher-availability rules, room-occupancy rules, package validation, repeat scheduling writes, or the database-level duplicate-session guard.
- Verification:
  - `npx tsx --test tests/session-conflict.test.ts tests/availability-conflict.test.ts tests/admin-teacher-availability.test.ts tests/quick-schedule-execution.test.ts`
  - `npm run build`
  - data check still confirms Coco + Jasmine `2026-04-27 17:30-19:00` already exists in the database, so the new conflict copy now points ops at the real reason first
- Rollback point: previous production commit before `2026-04-17-r83`.

## 2026-04-17-r82

- Release ID: `2026-04-17-r82`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: harden the quick schedule modal so `Find Available Teachers / 查找可用老师` always refreshes the candidate snapshot instead of depending on a manual page reload.
- Key files:
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `docs/tasks/TASK-20260417-quick-schedule-refresh-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a quick-schedule UI refresh follow-up. The Coco + Jasmine investigation showed the target `2026-04-27 17:30-19:00` lesson already existed in the database, so this release does not change scheduling rules; it only forces the modal to refresh server-rendered candidate results after the user asks for a new lookup.
- Verification:
  - `npm run build`
  - data check confirms Coco + Jasmine `2026-04-27 17:30-19:00` already exists in the database
  - browser check confirms `Find Available Teachers / 查找可用老师` now refreshes the candidate snapshot without needing a full page refresh
- Rollback point: previous production commit before `2026-04-17-r82`.

## 2026-04-17-r81

- Release ID: `2026-04-17-r81`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: fix the shared scroll interception rule so student-detail month paging and other same-path query+hash links can navigate normally instead of being trapped as pure anchor jumps.
- Key files:
  - `app/_components/ScrollManager.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260417-scroll-manager-query-hash-navigation-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still a narrow navigation-layer fix. Pure same-page hash jumps keep working, but links that also change the query string now navigate normally so the server-rendered content can update. No scheduling logic, package logic, or approval logic changed.
- Verification:
  - `npm run build`
  - production browser check confirms student detail `Prev Month / 上月` and `Next Month / 下月` now visibly change the rendered month while staying on `#calendar-tools`
  - verify pure same-page hash jumps still scroll correctly
- Rollback point: previous production commit before `2026-04-17-r81`.

## 2026-04-17-r80

- Release ID: `2026-04-17-r80`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: fix the student-detail scheduling calendar month pager so prev/next month visibly reloads the correct month instead of only changing the URL.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/StudentCalendarMonthPagerClient.tsx`
  - `docs/tasks/TASK-20260417-student-calendar-month-pager-hard-refresh.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a narrow student-detail calendar navigation fix. The month calculation on the server was already correct; the change only forces the month pager to perform a full navigation so the visible calendar content stays aligned with the URL. No scheduling logic, package logic, or calendar data rules changed.
- Verification:
  - `npm run build`
  - browser check confirms `Prev Month / 上月` and `Next Month / 下月` now visibly change the rendered month while staying on `#calendar-tools`
- Rollback point: previous production commit before `2026-04-17-r80`.

## 2026-04-17-r79

- Release ID: `2026-04-17-r79`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: keep quick schedule and the schedule calendar prominent on student detail while surfacing remaining lesson hours earlier.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260417-student-workbench-scheduling-priority-and-remaining-hours.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still student-detail UI-only. The page now keeps the most-used scheduling tools prominent and shows remaining lesson hours earlier, but no package math, scheduling rules, routing behavior, or workflow logic changed.
- Verification:
  - `npm run build`
  - production browser check confirms student detail keeps quick schedule and calendar prominent, surfaces remaining lesson hours earlier, and still preserves the recommended-first-action pattern
- Rollback point: previous production commit before `2026-04-17-r79`.

## 2026-04-17-r78

- Release ID: `2026-04-17-r78`
- Date/Time (Asia/Shanghai): `2026-04-17`
- Deployment status: `READY`
- Scope: make the student detail workbench clearly recommend the next action, keep quick schedule and calendar prominent, surface remaining lesson hours earlier, and group the remaining links into lighter sections.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260417-student-workbench-recommendation-and-grouping.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still student-detail UI-only. The page now chooses a recommended first action based on current state, keeps quick schedule and calendar prominent, surfaces remaining lesson hours earlier, and groups the remaining links more clearly, but all destinations and workflow logic stay the same.
- Verification:
  - `npm run build`
  - production browser check confirms student detail now highlights one recommended first action, keeps quick schedule and calendar prominent, surfaces remaining lesson hours earlier, groups secondary links, and keeps the sticky shortcut row as a separate jump layer
- Rollback point: previous production commit before `2026-04-17-r78`.

## 2026-04-16-r77

- Release ID: `2026-04-16-r77`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: simplify the student detail workbench block so it no longer reads like a second dense dashboard under the new sticky shortcut row.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/tasks/TASK-20260416-student-workbench-density-reset.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is UI-only on the student detail page. The student workbench now emphasizes a few primary actions and lighter secondary links, but all destinations, anchors, and workflow logic stay the same.
- Verification:
  - `npm run build`
  - production browser check confirms the student detail workbench no longer shows the old equal-weight card wall and still works with the compact sticky shortcut row above it
- Rollback point: previous production commit before `2026-04-16-r77`.

## 2026-04-16-r76

- Release ID: `2026-04-16-r76`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: clean up compact sticky shortcut labels so dense workbenches stop leaking count fragments into the new lightweight navigation row.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-compact-sticky-label-cleanup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still UI-only. The shortcut generator now prefers the bold primary heading inside each source link, which keeps labels clean without changing workflow rules, queue behavior, approvals, or routing.
- Verification:
  - `npm run build`
  - production browser check confirms expense claims now shows clean compact labels without count fragments, while student detail and ticket center keep the same lighter row with `More / 更多`
  - confirm expense-claims split-view detail pane remains sticky
- Rollback point: previous production commit before `2026-04-16-r76`.

## 2026-04-16-r75

- Release ID: `2026-04-16-r75`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: slim the generated admin sticky shortcut strips so they feel like lightweight navigation instead of dense mini workbenches.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-compact-sticky-density-reduction.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still UI-only. The compact sticky row now shows only the first few links inline, moves the rest into `More / 更多`, and strips noisy count-heavy labels. No workflow rules, approval logic, routing behavior, or queue logic changed.
- Verification:
  - `npm run build`
  - production browser check confirms student detail, ticket center, and expense claims now show the lighter compact sticky row with at most 3 inline links plus `More / 更多`
  - confirm expense-claims split-view detail pane remains sticky
- Rollback point: previous production commit before `2026-04-16-r75`.

## 2026-04-16-r74

- Release ID: `2026-04-16-r74`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: turn the downgraded oversized admin work maps into compact sticky shortcut strips instead of removing sticky access entirely.
- Key files:
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-compact-sticky-shortcuts.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is still UI-only. The guard now generates a compact sticky shortcut row from existing page links while the original large work map stays in normal flow. No workflow rules, queue rules, or routing logic changed.
- Verification:
  - `npm run build`
  - production-build browser check confirms student detail, ticket center, expense claims, and receipts approvals now keep a thin sticky shortcut row after the large work map is downgraded
  - confirm the expense-claims split-view detail pane remains sticky
- Rollback point: previous production commit before `2026-04-16-r74`.

## 2026-04-16-r73

- Release ID: `2026-04-16-r73`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: add an admin-layout sticky guard so oversized work-map bars stop covering the content below them.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/_components/WorkbenchStickyGuardClient.tsx`
  - `docs/tasks/TASK-20260416-admin-sticky-workmap-guard.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI-only layout guard that downgrades large sticky work-map panels to normal flow blocks while leaving smaller sticky detail panes and table headers alone. No approval, ticket, scheduling, attendance, package, or finance rules changed.
- Verification:
  - `npm run build`
  - production-build browser check confirms the large work-map bar no longer sticks on the main affected admin pages, including student detail, expense claims, receipts approvals, todos, tickets, partner settlement, teachers, classes, finance workbench, and attendance detail
  - confirm split-view right detail panes still stay sticky where they are intentionally narrow
- Rollback point: previous production commit before `2026-04-16-r73`.

## 2026-04-16-r72

- Release ID: `2026-04-16-r72`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: fix the approval inbox narrow-width overflow found during the next real admin QA sweep.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `docs/tasks/TASK-20260416-admin-approval-inbox-narrow-width-followup.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This is a UI-only responsive follow-up that tightens the approval inbox table/grid widths so the page fits with the admin sidebar visible. No approval routing, counts, lanes, or business logic changed.
- Verification:
  - `npm run build`
  - verify `/admin/approvals?focus=manager` no longer overflows horizontally around a `1024px` viewport width
  - verify the neighboring high-frequency workbenches (`expense-claims`, `receipts-approvals`, `todos`, `tickets`) still remain overflow-free at the same width
- Rollback point: previous production commit before `2026-04-16-r72`.

## 2026-04-16-r71

- Release ID: `2026-04-16-r71`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: fix the two real admin work-map anchor issues found during post-ship QA on partner settlement and conflicts.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/conflicts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-ux-phase-3a-anchor-followup.md`
- Risk impact (if any): Low. This is a narrow UI-only follow-up that only adjusts anchor targets and scroll offsets after QA. No settlement rules, conflict rules, or scheduling logic changed.
- Verification:
  - `npm run build`
  - verify `Partner Settlement / 合作方结算中心` work-map jump to `Action queue / 待处理队列` no longer lands under the sticky header
  - verify `Conflict Center / 冲突处理中心` work-map jump to `Conflict cards / 冲突卡片` still lands on a valid target even when the selected range currently has zero conflicts
- Rollback point: previous production commit before `2026-04-16-r71`.

## 2026-04-16-r70

- Release ID: `2026-04-16-r70`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: finish the next admin UX consistency pass on packages, partner settlement, teacher payroll, and conflicts with better remembered context, clearer banners, and more consistent status signals.
- Key files:
  - `app/admin/packages/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/conflicts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-ux-patterns-phase-3.md`
- Risk impact (if any): Low to medium. This release is still UI-only, but it expands remembered desk behavior and shared feedback/state components into more finance-heavy pages. The main watchpoints are making sure reset links clear remembered filters cleanly and that payroll/settlement status displays still mirror the same underlying workflow state as before.
- Verification:
  - `npm run build`
  - packages should keep scroll position, show clearer risk/status chips, and use shared next-step banners for resumed filters, post-action focus, and empty states
  - partner settlement should resume the last workbench view more clearly, keep scroll position, and show shared banners for schema issues, action outcomes, selected-item empty states, and empty pending-record queues
  - teacher payroll should resume its last desk filters only on normal return, clear properly through the default-desk link, and show shared action banners plus unified workflow chips in both queue and table views
  - conflicts should remember the last date/filter range on normal return, clear properly through the explicit reset link, preserve scroll position, and show shared chips/banners for conflict tags and empty-range states
- Rollback point: previous production commit before `2026-04-16-r70`.

## 2026-04-16-r69

- Release ID: `2026-04-16-r69`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: add the second layer of admin UX consistency improvements for remembered desks, shared status chips, clearer form sections, and steadier split workbenches.
- Key files:
  - `app/admin/_components/TeacherFilterForm.tsx`
  - `app/admin/_components/WorkbenchFormSection.tsx`
  - `app/admin/_components/WorkbenchSplitView.tsx`
  - `app/admin/_components/WorkbenchStatusChip.tsx`
  - `app/admin/_components/workbenchStyles.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/classes/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/teachers/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-ux-patterns-phase-2.md`
- Risk impact (if any): Low to medium. This release is still UI-only, but it expands shared admin UX helpers and remembered desk behavior across multiple high-frequency pages. The main watchpoint is making sure filter memory feels helpful, not sticky, when users intentionally clear back to the default desk.
- Verification:
  - `npm run build`
  - ticket, teacher, and class desks should resume remembered filters only when returning normally, and should clear cleanly with the explicit default-desk links
  - approvals, tickets, and receipts should show clearer shared status chips instead of mixed ad-hoc badges
  - expense claims review and finance sections should keep a steadier split-pane layout without changing workflow behavior
  - students list should now remember scroll position like other high-frequency desks
- Rollback point: previous production commit before `2026-04-16-r69`.

## 2026-04-16-r68

- Release ID: `2026-04-16-r68`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: finish the current admin workbench UI consistency pass and fix same-page anchor scrolling inside the admin scroll container.
- Key files:
  - `app/_components/ScrollManager.tsx`
  - `app/admin/_components/WorkbenchActionBanner.tsx`
  - `app/admin/_components/WorkbenchScrollMemoryClient.tsx`
  - `app/admin/_components/workbenchStyles.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-admin-workbench-ui-consistency-and-anchor-scroll.md`
- Risk impact (if any): Low to medium. This release is a broad admin UI/interaction polish pass across high-frequency pages. It does not change business rules, but it does touch shared navigation behavior and queue-page continuity, so the main watchpoint is making sure same-path stateful navigation still preserves context while same-page anchor jumps now correctly move the admin scroll container.
- Verification:
  - `npm run build`
  - local browser QA on `/admin/approvals`, `/admin/todos`, `/admin/tickets`, `/admin/expense-claims`, `/admin/feedbacks`, and `/admin/receipts-approvals`
  - shared workbench result banners should now explain success/failure/next-step outcomes more consistently on the main queue pages
  - the tested pages should not show obvious narrow-width horizontal overflow in the local QA pass
  - clicking work-map anchor links should now move to the target section inside the admin `.app-main` scroll container
  - target sections should not hide under the sticky workbench bar after anchor navigation
- Rollback point: previous production commit before `2026-04-16-r68`.

## 2026-04-16-r67

- Release ID: `2026-04-16-r67`
- Date/Time (Asia/Shanghai): `2026-04-16`
- Deployment status: `READY`
- Scope: unify the teacher after-class feedback late-deadline logic and make the late rule visible on the teacher session pages.
- Key files:
  - `lib/feedback-timing.ts`
  - `app/api/teacher/sessions/[id]/feedback/route.ts`
  - `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/teacher/sessions/page.tsx`
  - `lib/signin-alerts.ts`
  - `app/admin/alerts/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/api/admin/feedbacks/bulk-forward-overdue/route.ts`
  - `app/api/admin/feedbacks/proxy-draft/route.ts`
  - `tests/feedback-timing.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260416-feedback-deadline-clarity.md`
- Risk impact (if any): Low. This release does not change the business rule itself; feedback still becomes late only 12 hours after class end. The change centralizes that rule into one helper and makes the same deadline clearer across teacher pages, teacher submit responses, admin alerts, and admin feedback handling.
- Verification:
  - `npx tsx --test tests/feedback-timing.test.ts`
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npm run build`
  - teacher session detail should explicitly show when late starts instead of only saying “overdue”
  - teacher feedback submit success should say whether the save is still on time or already late
  - teacher session list, admin alerts, and admin feedback overdue workbench should still follow the same 12-hour deadline
- Rollback point: previous production commit before `2026-04-16-r67`.

## 2026-04-15-r66

- Release ID: `2026-04-15-r66`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: polish the approval and receipt UX after the finance-only receipt approval change.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-approval-receipt-ux-polish.md`
- Risk impact (if any): Low. This is a UI/copy cleanup plus removal of no-longer-used receipt manager approval page actions. Teacher payroll manager approval, partner settlement manager approval, expense approval, receipt finance approval, receipt creation, export gates, and super-admin correction behavior stay unchanged.
- Verification:
  - `npm run build`
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - narrow Approval Inbox rows should stack more cleanly instead of forcing a table-like horizontal layout
  - receipt detail should explain legacy manager entries as audit history only
  - super-admin correction copy should refer to the selected parent receipt instead of implying every selected receipt is already approved
  - receipt manager approve/reject page actions should no longer be present in the receipt approval page
- Rollback point: previous production commit before `2026-04-15-r66`.

## 2026-04-15-r65

- Release ID: `2026-04-15-r65`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: simplify parent and partner receipt approval so generated receipts require finance approval only, while keeping unrelated manager-approval workflows unchanged.
- Key files:
  - `lib/receipt-approval-policy.ts`
  - `lib/approval-inbox.ts`
  - `lib/global-invoice-sequence.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/history/export/route.ts`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/parent-receipt/[id]/route.ts`
  - `app/api/exports/partner-receipt/[id]/route.ts`
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-receipt-finance-only-approval.md`
- Risk impact (if any): Medium-low. This intentionally changes only the receipt approval policy from manager+finance to finance-only. It does not change teacher payroll manager approval, partner settlement approval, expense approval, receipt creation, payment proof linking, invoice math, package balance math, or super-admin correction rules.
- Verification:
  - `npm run build`
  - receipt reminders should still appear in Approval Inbox, but only under `Finance approval / 财务审批`
  - receipt manager approve/reject controls should no longer appear in the receipt approval center
  - finance should be able to approve a parent or partner receipt without prior manager approval
  - formal parent and partner receipt PDF exports should unlock after finance approval
  - finance workbench, package billing, parent statement, partner billing, and receipt history export should classify receipts using finance-only approval status
- Rollback point: previous production commit before `2026-04-15-r65`.

## 2026-04-15-r64

- Release ID: `2026-04-15-r64`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: add teacher payroll approval reminders into the unified Approval Inbox so management and finance can see payroll items that need their action.
- Key files:
  - `lib/teacher-payroll.ts`
  - `lib/approval-inbox.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-approval-inbox-teacher-payroll.md`
- Risk impact (if any): Low. This release only adds teacher payroll records to the existing approval reminder aggregation and adds a return banner from payroll back to the inbox. It does not change teacher payroll calculation, manager approval rules, finance confirmation rules, finance rejection rules, or payout logic.
- Verification:
  - `npm run build`
  - teacher payroll records that are teacher-confirmed but not manager-approved should appear in the manager approval lane
  - teacher payroll records that are manager-approved but not finance-confirmed or not paid should appear in the finance approval lane
  - Approval Inbox should show `Teacher payroll / 老师工资` rows with payroll totals when available
  - opening a teacher payroll reminder should focus the teacher payroll page and show a return banner back to Approval Inbox
- Rollback point: previous production commit before `2026-04-15-r64`.

## 2026-04-15-r63

- Release ID: `2026-04-15-r63`
- Date/Time (Asia/Shanghai): `2026-04-15`
- Deployment status: `READY`
- Scope: ship the next UX-continuity batch by extending Todo Center return paths into ticket and attendance flows, standardizing source-return banners, tightening student-detail first-screen weight, improving queue empty states, and stabilizing remaining two-column workbench layouts.
- Key files:
  - `app/admin/_components/WorkflowSourceBanner.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/sessions/[id]/attendance/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260415-ux-batch7-todo-continuity-status-empty-states.md`
- Risk impact (if any): Low. This release changes navigation continuity, status wording, empty-state guidance, first-screen grouping, and layout sizing only. It does not change approval rules, receipt math, attendance deduction rules, ticket status permissions, scheduling logic, or student/package data.
- Verification:
  - `npm run build`
  - Todo Center attendance and ticket links should carry a visible return path back to the original todo section
  - ticket detail and attendance pages should show a `From Todo Center / 来自待办中心` banner when opened from Todo Center
  - source banners for approval, receipt, package, and student-list workflows should use the same layout pattern
  - student detail should put next actions first and keep the profile snapshot collapsed until needed
  - package billing and todo empty states should explain what is empty and where to go next
  - expense claim split queues should keep their right-side detail panels aligned to their own content height
- Rollback point: previous production commit before `2026-04-15-r63`.

## 2026-04-14-r62

- Release ID: `2026-04-14-r62`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: extend the workflow-continuity UX batch by preserving “where you came from” between Students, Student Detail, Coordination, Receipt Queue, and Package Billing, while also tightening Package Billing into a more compact first-screen workspace with action-first receipt states.
- Key files:
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch6-workflow-continuity-and-package-billing.md`
- Risk impact (if any): Low. This release only changes navigation continuity, first-screen information grouping, and action-first status wording on existing admin pages. It does not change billing rules, receipt approval rules, student data, or scheduling behavior.
- Verification:
  - `npm run build`
  - student links opened from the list should carry a return path into student detail and coordination
  - package billing opened from receipt approvals should show a visible return path back to the same receipt queue
  - package billing first screen should show summary context first and keep create-invoice behind an expandable section
  - package receipt progress and approval states should read more action-first
- Rollback point: previous production commit before `2026-04-14-r62`.

## 2026-04-14-r61

- Release ID: `2026-04-14-r61`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: hotfix the expense-claims dual-queue layout so the selected detail panels keep their own content height instead of stretching to match a long left queue.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-expense-queue-panel-height-hotfix.md`
- Risk impact (if any): Low. This release only changes the grid alignment and selected-panel sizing inside Expense Claims. It does not change approval rules, queue data, payment logic, or navigation flow.
- Verification:
  - `npm run build`
  - submitted review queue should no longer stretch the selected panel to the same height when the left list is long
  - finance queue should no longer stretch the selected payout group panel to the same height when the left list is long
- Rollback point: previous production commit before `2026-04-14-r61`.

## 2026-04-14-r60

- Release ID: `2026-04-14-r60`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: extend the tighter queue-workbench pattern into Approval Inbox and Expense Claims by compressing approval-row scan density, making expense review and finance groups easier to compare, and adding previous/next navigation inside the selected expense panels.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch5-approval-and-expense-density-navigation.md`
- Risk impact (if any): Low. This release only changes approval-list density, queue-navigation affordances, and selected-panel guidance on existing approval pages. It does not change expense approval rules, payment rules, or receipt logic.
- Verification:
  - `npm run build`
  - approval inbox rows should read more compactly without losing key metadata
  - expense review should show previous/next navigation for submitted claims
  - finance queue should show previous/next navigation for approved-unpaid groups
- Rollback point: previous production commit before `2026-04-14-r60`.

## 2026-04-14-r59

- Release ID: `2026-04-14-r59`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: tighten the receipt-approval workbench one more step by compressing queue cards into faster-scan metadata rows and turning the detail drawer into a clearer processing cockpit with queue position plus previous/next navigation.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch4-receipt-queue-density-and-drawer-navigation.md`
- Risk impact (if any): Low. This release only changes layout density, summary duplication, and intra-queue navigation inside the existing receipt approval workbench. It does not change receipt approvals, payment-proof repair rules, billing math, or audit behavior.
- Verification:
  - `npm run build`
  - receipt queue cards should show a shorter inline metadata row instead of three stacked detail lines
  - selected receipt drawer should show queue position and explicit previous/next navigation
  - receipt detail should no longer repeat the same receipt/type/invoice summary in multiple stacked blocks
- Rollback point: previous production commit before `2026-04-14-r59`.

## 2026-04-14-r58

- Release ID: `2026-04-14-r58`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: ship the third UX-efficiency batch by making approval and queue status language more action-first, keeping a visible “from Approval Inbox” return path inside receipt approvals and expense claims, and preserving that source workflow when users keep moving through the linked review actions.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `lib/approval-inbox.ts`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch3-approval-language-and-return-paths.md`
- Risk impact (if any): Low. This release only changes navigation continuity, status wording, and workflow context banners on existing approval-driven admin pages. It does not change receipt approval rules, expense approval permissions, billing math, or data mutation rules.
- Verification:
  - `npm run build`
  - opening an item from `/admin/approvals` should carry `source=approvals` into receipt approvals or expense claims
  - receipt approvals and expense claims should show a visible “From Approval Inbox” return banner when entered from that workflow
  - pending statuses should read as action-oriented next steps instead of only passive state labels
- Rollback point: previous production commit before `2026-04-14-r58`.

## 2026-04-14-r57

- Release ID: `2026-04-14-r57`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: ship the second UX-efficiency batch by tightening the receipt-approval queue into a clearer processing workbench, pushing expense-approval config below the live queues, and finally making the dedicated student coordination page behave like a true light-shell workspace instead of still carrying the rest of the long student detail flow.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch2-receipts-expense-coordination.md`
- Risk impact (if any): Low. This release only changes layout emphasis, information density, and workspace shell behavior on existing admin pages. It does not change receipt math, approval rules, expense-claim decisions, student data, scheduling logic, or package behavior.
- Verification:
  - `npm run build`
  - receipt approvals should show a stronger current-work-focus strip and queue-display controls with visible counts
  - expense claims should keep approval config below the live queues instead of taking first-screen space
  - `/admin/students/[id]/coordination` should no longer render the long calendar, packages, attendance, quick-schedule, and edit sections underneath the coordination workspace
- Rollback point: previous production commit before `2026-04-14-r57`.

## 2026-04-14-r56

- Release ID: `2026-04-14-r56`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: start the first UX-efficiency batch from the 2026-04-14 review by compressing the admin dashboard first screen, turning approval inbox into a denser action-oriented review list, and making student-list dataset scope plus restored-filter state much harder to misread.
- Key files:
  - `app/admin/page.tsx`
  - `app/admin/approvals/page.tsx`
  - `app/admin/students/page.tsx`
  - `docs/UX-REVIEW-20260414.md`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-ux-batch1-dashboard-approvals-students.md`
- Risk impact (if any): Low. This release only changes presentation density, layout emphasis, current-scope messaging, and navigation affordances on existing admin pages. It does not change approval rules, receipt math, billing state, scheduling logic, student data, or package behavior.
- Verification:
  - `npm run build`
  - admin dashboard should show a tighter first screen with priority work and compact operational metrics
  - approval inbox should show filter counts and a denser review list instead of only large action cards
  - student list should clearly show current dataset scope and warn users when the system restored a previous desk or filter context
- Rollback point: previous production commit before `2026-04-14-r56`.

## 2026-04-14-r55

- Release ID: `2026-04-14-r55`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: stop the approval-inbox filter chips and item links from using full-page anchor navigation, so switching filters inside `/admin/approvals` no longer hard-refreshes the shared left sidebar.
- Key files:
  - `app/admin/approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-approval-inbox-client-navigation.md`
- Risk impact (if any): Low. This release only swaps approval-inbox links from full-document anchors to Next.js client navigation inside the existing admin layout. It does not change approval data, counts, filters, receipt logic, expense logic, or sidebar contents.
- Verification:
  - `npm run build`
  - switching between `/admin/approvals` filters should no longer hard-refresh the left admin sidebar
  - opening approval items from the inbox should use the same client-side navigation behavior where applicable
- Rollback point: previous production commit before `2026-04-14-r55`.

## 2026-04-14-r54

- Release ID: `2026-04-14-r54`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: add a first unified `Approval Inbox / 审批提醒中心` that consolidates pending parent receipt, partner receipt, and expense-claim approvals into one admin page, while also surfacing the same pending counts in the sidebar and admin home summary cards.
- Key files:
  - `lib/approval-inbox.ts`
  - `app/admin/approvals/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-approval-inbox-v1.md`
- Risk impact (if any): Low. This release adds a read-only cross-workspace approval summary and new navigation entry points for manager, finance, and super-admin users. It does not change the underlying approval rules, approval order, receipt math, expense-claim decisions, billing data, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - `/admin/approvals` should show pending parent receipt, partner receipt, and expense-claim items relevant to the current user
  - sidebar navigation should expose `Approval Inbox / 审批提醒` with a live pending count for admin and finance users
  - admin home summary should show the new pending-approvals card and link into `/admin/approvals`
- Rollback point: previous production commit before `2026-04-14-r54`.

## 2026-04-14-r53

- Release ID: `2026-04-14-r53`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: allow strict super-admin `zhao hongwei` to directly correct approved parent receipts in place from the receipt detail drawer without forcing a revoke-and-redo loop, while preserving existing approvals and writing every change into the audit log.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-super-admin-direct-parent-receipt-correction.md`
- Risk impact (if any): Medium. This release intentionally lets one strict super-admin edit approved parent receipt fields in place and keep prior approvals valid. The scope is limited to parent receipts, still writes audit logs, and still blocks cumulative amountReceived from exceeding the linked invoice total.
- Verification:
  - `npm run build`
  - only `zhao hongwei` should see the direct correction form on parent receipt details
  - direct correction should allow updating receipt date, received from, paid by, amount, gst, total, amount received, and note
  - existing approvals should remain intact after a direct correction
  - direct correction should still reject amountReceived values that would push the linked invoice above its total
- Rollback point: previous production commit before `2026-04-14-r53`.

## 2026-04-14-r52

- Release ID: `2026-04-14-r52`
- Date/Time (Asia/Shanghai): `2026-04-14`
- Deployment status: `READY`
- Scope: let finance backfill or correct amounts on existing parent payment-proof records inline, and require a final click-through confirmation when a new receipt amount diverges from the invoice remaining balance or the selected proof amount.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/ConfirmCreateReceiptButton.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260414-parent-proof-amount-backfill-and-confirmation.md`
- Risk impact (if any): Low. This release adds finance-side metadata editing for existing parent payment proofs and a submit-time confirmation guard for create-receipt mismatches. It does not change invoice math, receipt numbering, payment-record uniqueness, approval decisions, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - existing payment-proof rows should allow finance to save or update a proof amount inline
  - create-receipt submit should pop a confirmation when amount received is above or below invoice remaining balance
  - create-receipt submit should also pop a confirmation when amount received differs from the selected proof amount
- Rollback point: previous production commit before `2026-04-14-r52`.

## 2026-04-13-r51

- Release ID: `2026-04-13-r51`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: add an optional amount field to parent payment-proof records so finance can compare selected proof amounts against invoice remaining balance and entered receipt amounts with real data instead of guesswork.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/ReceiptAmountReceivedField.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-payment-proof-amount.md`
- Risk impact (if any): Low. This release adds an optional payment-proof amount field for parent billing and uses it for finance-side comparison hints only. It does not change receipt numbering, remaining-balance caps, payment-record uniqueness, approval logic, statement math, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - payment-proof upload and replacement should allow entering an optional amount
  - existing payment-record tables and selectors should show stored proof amounts when available
  - receipt create form should compare entered amount against both invoice remaining balance and selected proof amount when that proof amount exists
- Rollback point: previous production commit before `2026-04-13-r51`.

## 2026-04-13-r50

- Release ID: `2026-04-13-r50`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: finish the next round of finance-side parent partial-receipt improvements by adding a dedicated partial-receipt follow-up queue in finance workbench, a downloadable invoice receipt progress CSV, stronger create-form amount warnings, and more automatic next-receipt shortcuts that carry the only unlinked proof when it is unambiguous.
- Key files:
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/receipts-approvals/_components/ReceiptAmountReceivedField.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-receipt-finance-polish.md`
- Risk impact (if any): Low. This release improves finance-facing queueing, export, shortcut, and warning UX around parent partial receipts. It does not change receipt numbering rules, amount-validation caps, payment-record uniqueness, approval decisions, statement math, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - finance workbench should expose a dedicated partial-receipt follow-up queue sorted by due date and remaining amount
  - finance workbench should export an invoice receipt progress CSV for the current filtered dataset
  - package billing should carry the only unlinked payment proof into next-receipt shortcuts when that recommendation is unambiguous
  - receipt create form should show live warnings when amount received is above or below the invoice remaining balance
- Rollback point: previous production commit before `2026-04-13-r50`.

## 2026-04-13-r49

- Release ID: `2026-04-13-r49`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: make parent partial-receipt follow-up actions more explicit by exposing the exact next receipt number in package billing and receipt-approval detail shortcuts, so finance can jump straight into `RC2`, `RC3`, and later receipts instead of guessing from a generic "next receipt" label.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-next-receipt-shortcuts.md`
- Risk impact (if any): Low. This release only changes finance-facing shortcut labels and navigation hints for follow-up parent receipts. It does not change receipt numbering rules, amount validation, proof-link uniqueness, approvals, statement math, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - package billing invoice rows with remaining balance should show `Create RC2` / `Create RC3` style actions plus the full next receipt number
  - receipt-approval package workspace next-step helper should expose the same explicit `RC2` / `RC3` label when a next receipt is recommended
  - selected parent receipt details should show a dedicated next partial-receipt card that opens the create step with the same invoice only, without reusing the current linked payment proof
- Rollback point: previous production commit before `2026-04-13-r49`.

## 2026-04-13-r48

- Release ID: `2026-04-13-r48`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: add automated parent partial-receipt backend coverage and fix the leftover receipt-number validator so `-RC2`, `-RC3`, and later receipts are accepted by the store layer instead of being blocked by the old single-receipt regex.
- Key files:
  - `lib/student-parent-billing.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-receipt-tests-and-validator-fix.md`
- Risk impact (if any): Medium. This release changes backend receipt-number validation for parent receipts and adds automated coverage around multi-receipt edge cases. It does not change partner billing, finance approvals, statement math, package deduction logic, scheduling, sessions, or package behavior.
- Verification:
  - `npx tsx --test tests/billing-optimistic-lock.test.ts`
  - `npm run test:backend`
  - `npm run build`
  - the backend should now accept `InvoiceNo-RC2`, `InvoiceNo-RC3`, and later parent receipt numbers
  - tests should cover numbering progression, valid second partial receipt creation, over-receipt blocking, and duplicate payment-record rejection
- Rollback point: previous production commit before `2026-04-13-r48`.

## 2026-04-13-r47

- Release ID: `2026-04-13-r47`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: streamline the next parent receipt creation flow by surfacing a recommended next-receipt card, carrying the next receipt number into invoice pickers, and auto-selecting the most usable unlinked payment proof when possible.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-next-receipt-helper.md`
- Risk impact (if any): Low. This release only improves finance-side guidance and default selections inside the create-receipt workspace. It does not change receipt numbering rules, amount validation, approvals, statement math, package deduction logic, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - package finance workspace should show a recommended next-receipt card with invoice no., next receipt no., remaining amount, and suggested proof
  - when only one usable unlinked payment record exists, it should auto-select and explain why
  - `Create the next receipt` package helper should open the create step with the recommended invoice and proof already carried in the URL
  - invoice pickers in the create flow should show the next receipt number alongside remaining amount
- Rollback point: previous production commit before `2026-04-13-r47`.

## 2026-04-13-r46

- Release ID: `2026-04-13-r46`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: make parent partial-receipt progress easier for finance to read by surfacing invoice-level receipt totals, remaining balance, and next-step context in package billing, statement export, and receipt-history export.
- Key files:
  - `app/admin/packages/[id]/billing/page.tsx`
  - `app/api/exports/parent-statement/[id]/route.ts`
  - `app/admin/receipts-approvals/history/export/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-receipt-visibility.md`
- Risk impact (if any): Low. This release only improves finance-facing visibility for invoice receipt progress and remaining balance; it does not change parent receipt numbering, approval rules, payment-record linking, package deduction logic, partner billing, scheduling, sessions, or package behavior.
- Verification:
  - `npm run build`
  - package billing should show each invoice's receipt count, created/approved/pending amounts, and remaining amount
  - each receipt row in package billing should show the linked invoice's overall receipt progress
  - statement PDF should include an invoice receipt breakdown section so finance can see partial receipt progress per invoice
  - receipt history CSV should export invoice total, receipt count, receipted amount, pending amount, and remaining amount for parent receipts
- Rollback point: previous production commit before `2026-04-13-r46`.

## 2026-04-13-r45

- Release ID: `2026-04-13-r45`
- Date/Time (Asia/Shanghai): `2026-04-13`
- Deployment status: `READY`
- Scope: support multiple parent receipts on the same invoice for partial payments, keep the first receipt number as `-RC`, continue later receipts as `-RC2`, `-RC3`, and make finance pages show remaining receiptable amount instead of blocking after the first receipt.
- Key files:
  - `lib/student-parent-billing.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260413-parent-partial-multi-receipt.md`
- Risk impact (if any): Medium. This release changes parent receipt numbering, invoice-to-receipt linking rules, finance workbench status interpretation, and create-receipt defaults for partial payments. It intentionally does not change partner billing, package deduction logic, scheduling, sessions, packages, or finance approvals themselves.
- Verification:
  - `npm run build`
  - a parent invoice with one approved partial receipt should still remain selectable in `/admin/receipts-approvals` while it has remaining receiptable amount
  - the next auto-generated receipt number should be `InvoiceNo-RC2`, `InvoiceNo-RC3`, etc., while the first receipt stays `InvoiceNo-RC`
  - create-receipt defaults should show `already receipted` and `remaining to receipt`, and should default the new receipt amount to the remaining amount
  - finance workbench should show `Partially Receipted / 部分已开收据` instead of treating the invoice as fully finished after the first approved partial receipt
  - over-receipting should be blocked, while valid partial receipts should no longer be flagged as a mismatch by default
- Rollback point: previous production commit before `2026-04-13-r45`.

## 2026-04-12-r44

- Release ID: `2026-04-12-r44`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: add an obvious close/return action inside the dedicated student coordination workspace so ops can leave the workspace without getting stuck on that page.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-student-coordination-close-button.md`
- Risk impact (if any): Low. This release only adjusts student-detail coordination navigation labels and destinations; it does not change coordination tickets, helper generation, parent availability, quick scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - the student-detail workbench should show `Close coordination workspace / 关闭排课协调工作台` instead of another open-link when already inside `/admin/students/[id]/coordination`
  - the dedicated coordination page header should also expose the same close action back to the main student detail page
  - closing the workspace should return to `/admin/students/[id]` without affecting any coordination state
- Rollback point: previous production commit before `2026-04-12-r44`.

## 2026-04-12-r43

- Release ID: `2026-04-12-r43`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: move the student-detail scheduling-coordination workspace out of the already crowded profile page into its own dedicated student coordination page, while leaving the coordination logic itself unchanged.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/coordination/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-student-detail-coordination-dedicated-page.md`
- Risk impact (if any): Low to medium. This release changes student-detail navigation and where coordination actions live, but it does not change ticket logic, parent-time matching, quick scheduling rules, teacher availability, sessions, packages, deductions, or finance behavior.
- Verification:
  - `npm run build`
  - `/admin/students/[id]` should now show a concise coordination summary card instead of the full coordination workspace
  - the new `/admin/students/[id]/coordination` page should load the full existing coordination workspace
  - student-detail coordination buttons, helper forms, and ticket back-links should now open or return to the dedicated coordination page
  - the rest of student detail should remain usable without the large coordination block in the middle of the page
- Rollback point: previous production commit before `2026-04-12-r43`.

## 2026-04-12-r42

- Release ID: `2026-04-12-r42`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: rebalance calendar-mode coordination candidates so the first helper slots cover more of the parent's selected dates instead of letting earlier dates consume the whole shortlist.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-coordination-calendar-date-coverage.md`
- Risk impact (if any): Low. This release does not change teacher availability, parent payload matching rules, ticket lifecycle, or scheduling storage; it only changes how already-matched calendar-date slots are prioritized before the helper trims them to a short list.
- Verification:
  - `npm run build`
  - for calendar-mode parent submissions with several selected dates, the first helper shortlist should try to surface at least one option from each requested date before repeating earlier dates
  - the underlying matching rules should stay the same, so dates with no matching teacher availability should still be absent
  - the existing example ticket `20260409-004` should now surface `2026-04-11`, `2026-04-13`, `2026-04-19`, and `2026-04-20` inside the first five generated options instead of concentrating mostly on the earliest two dates
- Rollback point: previous production commit before `2026-04-12-r42`.

## 2026-04-12-r41

- Release ID: `2026-04-12-r41`
- Date/Time (Asia/Shanghai): `2026-04-12`
- Deployment status: `READY`
- Scope: make scheduling-coordination helper status stop claiming a confirmed ticket is ready to schedule after the parent re-submits availability, and generate candidate slots by searching the parent-submitted availability window before filtering.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `app/availability/[token]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260412-coordination-manual-review-and-parent-window-match.md`
- Risk impact (if any): Medium. This release changes scheduling-coordination helper interpretation and candidate-slot generation, but it keeps the existing parent-availability payload, ticket lifecycle, teacher availability storage, quick scheduling, sessions, packages, deductions, and finance logic unchanged.
- Verification:
  - `npm run build`
  - a coordination ticket that was already `Confirmed` and then receives a new parent submission should show `Manual review needed / 需人工复核` instead of `Ready to schedule / 可直接排课`
  - student detail, ticket detail, and todo follow-up cards should agree on that manual-review phase
  - generated helper slots should search within the parent-submitted availability window first instead of only slicing a small teacher-slot list and filtering afterwards
  - suggested duration should prefer the coordination ticket's own `durationMin` when present, and only fall back to existing session samples or `45`
- Rollback point: previous production commit before `2026-04-12-r41`.

## 2026-04-11-r40

- Release ID: `2026-04-11-r40`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let one valid parent-availability link show all active coordination courses for the same student on one page, while keeping each course on its own ticket, submission, and matching lane.
- Key files:
  - `app/availability/[token]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/api/tickets/intake/[token]/route.ts`
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-parent-availability-multi-course-same-page.md`
- Risk impact (if any): Medium. This release keeps the existing schema and one-ticket-per-course storage model, but it changes how coordination tickets are reused and displayed by making the student page and public parent form course-aware instead of always following only the first open coordination ticket.
- Verification:
  - `npm run build`
  - opening any valid `/availability/[token]` link for a student with multiple active coordination requests should show one card per course on the same page
  - each course card should submit independently without overwriting another course's payload
  - student detail should let ops switch helper focus between open coordination tickets and create a new coordination ticket only for courses that are not already being tracked
  - intake should reuse an open coordination ticket only when the incoming course matches the existing course lane; a different course should not be forced into the first open ticket
- Rollback point: previous production commit before `2026-04-11-r40`.

## 2026-04-11-r39

- Release ID: `2026-04-11-r39`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let the parent-availability calendar-date mode accept multiple time ranges on the same day, while keeping the original weekly template and data shape intact.
- Key files:
  - `app/availability/[token]/ParentAvailabilityFormFields.tsx`
  - `lib/parent-availability.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-parent-availability-multi-range-per-date.md`
- Risk impact (if any): Low to medium. This release only expands the exact-date parent-availability input so one selected day can carry multiple time ranges; it keeps the existing weekly template mode, database schema, scheduling slot matching model, quick scheduling, sessions, packages, deductions, and finance logic unchanged.
- Verification:
  - `npm run build`
  - `/availability/[token]` calendar-date mode should let families add up to three time ranges to one selected date
  - the submitted payload should continue using the existing flat `dateSelections[]` structure, with repeated dates allowed for multiple ranges
  - admin summaries should group one date's multiple time ranges into a readable combined line
- Rollback point: previous production commit before `2026-04-11-r39`.

## 2026-04-11-r38

- Release ID: `2026-04-11-r38`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: add a second parent-availability input mode so families can either fill a weekly repeating template or pick specific upcoming dates and times in a calendar-style view.
- Key files:
  - `app/availability/[token]/page.tsx`
  - `app/availability/[token]/ParentAvailabilityFormFields.tsx`
  - `lib/parent-availability.ts`
  - `lib/scheduling-coordination.ts`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-parent-availability-calendar-mode.md`
- Risk impact (if any): Medium. This release expands the parent-availability payload and matching rules to support specific date picks, but it keeps the existing weekly template mode intact and does not change teacher availability storage, quick scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - `/availability/[token]` should let families choose between weekly template mode and calendar-date mode
  - weekly submissions should continue storing and matching the current weekday plus time-range structure
  - calendar submissions should store specific date plus time selections and show them in ticket/student detail summaries
  - scheduling-coordination preview matching should respect the submitted mode without missing later exact-date selections
- Rollback point: previous production commit before `2026-04-11-r38`.

## 2026-04-11-r37

- Release ID: `2026-04-11-r37`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: restore a clear completion-note prompt in ticket-center status actions so operators are asked for the note before a ticket is marked completed, without bouncing the page to the top.
- Key files:
  - `app/admin/_components/TicketStatusSubmitButton.tsx`
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-ticket-complete-note-prompt.md`
- Risk impact (if any): Low. This release only changes the completion-note prompt UX before status submission; it keeps the existing server-side completion-note requirement and does not change ticket rules, permissions, scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - choosing `Completed` without a note from ticket-center list should show a prompt before submission
  - choosing `Completed` without a note from ticket detail should show the same prompt before submission
  - cancelling or leaving the prompt empty should not submit the form or jump to the top of the page
- Rollback point: previous production commit before `2026-04-11-r37`.

## 2026-04-11-r36

- Release ID: `2026-04-11-r36`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: keep ticket-center operators in context by returning list actions to the current ticket area and detail actions to the section they just edited instead of bouncing the page back to the top.
- Key files:
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-ticket-center-scroll-position.md`
- Risk impact (if any): Low. This release only changes post-action return anchors in ticket-center surfaces; it does not change ticket permissions, status rules, archive/delete eligibility, intake behavior, scheduling, sessions, packages, deductions, or finance logic.
- Verification:
  - `npm run build`
  - saving an open ticket status from `/admin/tickets` should return to the same ticket row instead of the top of the page
  - archiving or deleting a closed ticket from ticket-center lists should return to the ticket list section instead of the top summary area
  - saving status, editing fields, or using scheduling-coordination quick actions in ticket detail should return to the same section instead of the page top
- Rollback point: previous production commit before `2026-04-11-r36`.

## 2026-04-11-r35

- Release ID: `2026-04-11-r35`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let Zhao Hongwei permanently delete already-closed tickets from the ticket center while keeping the existing archive-first flow for everyone else.
- Key files:
  - `app/admin/tickets/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-ticket-center-zhao-hongwei-hard-delete.md`
- Risk impact (if any): Medium. This release adds an irreversible delete path for one strict super admin, but only for completed, cancelled, or archived tickets; it does not change open-ticket handling, status transitions, intake links, scheduling, sessions, packages, deductions, or finance flows.
- Verification:
  - `npm run build`
  - Zhao Hongwei should see `Delete permanently / 永久删除` on completed, cancelled, or archived tickets in ticket center surfaces
  - non-Zhao users should not see or be able to use the permanent delete path
  - open tickets should still reject permanent delete attempts
- Rollback point: previous production commit before `2026-04-11-r35`.

## 2026-04-11-r34

- Release ID: `2026-04-11-r34`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: keep scheduling-coordination ticket reuse consistent by making the intake success state clearly say when the current open coordination ticket was reused instead of implying a new one was created.
- Key files:
  - `app/tickets/intake/IntakeForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-ticket-reuse.md`
- Risk impact (if any): Low. This release only corrects reuse messaging in the coordination intake success state; it does not change how the active coordination ticket is selected, how parent links are generated, or any scheduling, session, package, deduction, or finance behavior.
- Verification:
  - `npm run build`
  - when intake reuses an existing open scheduling-coordination ticket, the success banner should clearly say the current ticket was reused
  - if that reused ticket still has an active parent-availability link, the green success card should say the current ticket was reused instead of saying a new ticket was created
  - new scheduling-coordination tickets should keep the existing "ticket created" success wording
- Rollback point: previous production commit before `2026-04-11-r34`.

## 2026-04-11-r33

- Release ID: `2026-04-11-r33`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: let ops push scheduling-coordination progress directly from the student coordination page, while also writing clearer follow-up notes into the linked coordination ticket summary.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-student-action-sync.md`
- Risk impact (if any): Low. This release only adds clearer scheduling-coordination progress actions and summary updates; it does not change quick scheduling rules, teacher exception replies, sessions, packages, deductions, or finance flows.
- Verification:
  - `npx tsc --noEmit` passed
  - `npm run build` passed
  - ticket detail quick actions now update both status and coordination summary wording
  - student coordination helper cards now let ops mark options sent, mark alternatives sent, or move the item into teacher exception follow-up without leaving the student page
  - these student-page actions return to the same coordination section instead of dropping the operator out of context
- Rollback point: previous production commit before `2026-04-11-r33`.

## 2026-04-11-r32

- Release ID: `2026-04-11-r32`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: continue scheduling-coordination auto-progress so a parent availability submission now immediately re-evaluates current teacher availability and updates the linked coordination ticket to a more accurate ops follow-up state.
- Key files:
  - `lib/scheduling-coordination.ts`
  - `app/availability/[token]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260411-scheduling-coordination-auto-phase-advance.md`
- Risk impact (if any): Low to medium. This release only changes scheduling-coordination ticket follow-up updates after a parent availability submission; it does not change quick scheduling, teacher exception reply logic, sessions, packages, deductions, or finance flows.
- Verification:
  - `npx tsc --noEmit` passed
  - parent availability submission now checks current teacher-availability-backed slot matches before writing back to the linked coordination ticket
  - matching submissions now move the ticket into an ops-review state with "matching slots ready" guidance
  - no-match submissions now move the ticket into an ops-review state with "review alternatives first / ask teacher exception if needed" guidance
- Rollback point: previous production commit before `2026-04-11-r32`.

## 2026-04-11-r31

- Release ID: `2026-04-11-r31`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: simplify partner invoice line descriptions so they show only the student name in newly created online settlement invoices and in exported partner invoice PDFs.
- Key files:
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes partner invoice description text; it does not change receipt generation, invoice totals, settlement selection, approval rules, or deduction logic.
- Verification:
  - `npm run build` passed
  - newly created online partner invoices now store each settlement line description as the student name only
  - exported partner invoice PDFs now show only the student name even when older stored line descriptions still contain the legacy `Package settlement - student - course - dates` format
- Rollback point: previous production commit before `2026-04-11-r31`.

## 2026-04-11-r30

- Release ID: `2026-04-11-r30`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: force the narrow-screen receipt drawer backdrop to keep the same dark overlay color during hover, active, and focus states so the page no longer flashes the global purple link tint when finance clicks outside the drawer.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This hotfix only strengthens backdrop style overrides for the receipt drawer overlay; it does not change receipt approval behavior, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - narrow-screen receipt drawer backdrop keeps the same dark overlay during hover, click, and focus instead of flashing the global purple link/button tint
  - clicking outside the drawer still closes back to the current queue or history list state
- Rollback point: previous production commit before `2026-04-11-r30`.

## 2026-04-11-r29

- Release ID: `2026-04-11-r29`
- Date/Time (Asia/Shanghai): `2026-04-11`
- Deployment status: `READY`
- Scope: neutralize the narrow-screen receipt detail backdrop so clicking or hovering outside the drawer no longer shows the global purple link/button tint.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This hotfix only resets inherited link styles on the receipt drawer backdrop; it does not change receipt approval behavior, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - narrow-screen receipt drawer backdrop no longer shows the inherited purple button/link styling when finance clicks or hovers outside the drawer
  - the drawer still closes back to the current list state when finance clicks outside it
- Rollback point: previous production commit before `2026-04-11-r29`.

## 2026-04-10-r28

- Release ID: `2026-04-10-r28`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make selected receipt details easier to identify by surfacing receipt amount and invoice total near the top of the approval detail panel.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only adds amount summary display inside receipt details; it does not change receipt approval rules, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - selected receipt details now show `Receipt amount / 收据金额` and `Invoice total / 发票总额` near the top
  - the detail summary should clearly indicate whether the receipt amount matches the invoice total
- Rollback point: previous production commit before `2026-04-10-r28`.

## 2026-04-10-r27

- Release ID: `2026-04-10-r27`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: tighten the narrow-screen receipt detail overlay so it opens only after an explicit row click and behaves like a contained drawer instead of covering nearly the full screen.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This hotfix only adjusts when the narrow-screen receipt overlay appears and how large it is; it does not change receipt approval rules, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - narrow receipt queue/history screens do not show the overlay until finance explicitly opens a receipt row
  - the narrow-screen overlay now renders as a smaller right-side drawer with visible page margins instead of occupying almost the whole screen
  - wide screens keep the existing two-column queue-plus-detail layout
- Rollback point: previous production commit before `2026-04-10-r27`.

## 2026-04-10-r26

- Release ID: `2026-04-10-r26`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: keep receipt queue and receipt history usable on narrower screens by turning the selected receipt detail panel into a dismissible overlay instead of a long stacked second column.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes narrow-screen presentation for receipt details; it does not change receipt approval rules, package finance actions, invoice behavior, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - on narrow screens, selecting a receipt from `Receipt Queue / 收据审批队列` or `Receipt History / 收据历史` now opens the detail panel as an overlay instead of stacking it below the queue
  - the overlay includes a direct `Back to list / 返回列表` action and tapping outside it closes back to the current filtered list
  - on wide screens, the existing two-column queue-plus-detail layout remains unchanged
- Rollback point: previous production commit before `2026-04-10-r26`.

## 2026-04-10-r25

- Release ID: `2026-04-10-r25`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance student-package invoice page remember recently used packages so repeated invoice work does not require a fresh search every time.
- Key files:
  - `app/admin/finance/student-package-invoices/_components/PackageSelectAutoSubmit.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only adds local recent-package shortcuts on the finance invoice page; it does not change invoice issuance, receipt approvals, package balance math, settlement logic, or deduction behavior.
- Verification:
  - `npm run build` passed
  - `/admin/finance/student-package-invoices` now remembers recent package selections in the browser and shows quick reopen chips
  - selecting a recent package chip updates the picker without auto-submitting the form
  - finance still must click `Load package summary / 加载课包摘要` before invoice totals and preview refresh
- Rollback point: previous production commit before `2026-04-10-r25`.

## 2026-04-10-r17

- Release ID: `2026-04-10-r17`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: make the finance receipt queue easier to move through and make receipt history easier to narrow without changing any billing or approval rules.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only adds navigation and filtering helpers on the finance receipt screens; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - `Next best item / 下一条最该处理` should show a direct `Open next item / 打开下一条` action
  - `/admin/receipts-approvals/history` should support `All history / 全部历史`, `Receipts only / 只看收据`, and `Actions only / 只看动作`
  - `/admin/receipts-approvals/history` should let finance narrow `Recent Finance Actions / 最近财务动作` by action type
- Rollback point: previous production commit before `2026-04-10-r17`.

## 2026-04-10-r16

- Release ID: `2026-04-10-r16`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `READY`
- Scope: keep the finance receipt workspace from auto-jumping back to the top when switching the top receipt mode tabs.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes scroll behavior for the top receipt mode tabs; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - top receipt mode tabs should keep using client navigation without a full page reload
  - left finance sidebar should keep its current scroll position when switching between `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History`
  - main finance receipt content should keep its current page scroll position instead of jumping back to the top on each top-tab switch
  - finance sidebar should keep `Receipt Queue / 收据审批队列` highlighted when the queue is reopened from top workflow tabs or finance dashboard links
- Rollback point: previous production commit before `2026-04-10-r16`.

## 2026-04-10-r15

- Release ID: `2026-04-10-r15`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: stop the finance receipt top mode tabs from doing full page reloads so the left sidebar scroll state stays put while switching between finance receipt sub-pages.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only changes navigation behavior for the top receipt mode tabs; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - top receipt mode tabs should switch screens through client navigation instead of full page reload
  - left finance sidebar should keep its current scroll position when switching between `Receipt Queue`, `Package Workspace`, `Proof Repair`, and `Receipt History`
- Rollback point: previous production commit before `2026-04-10-r15`.

## 2026-04-10-r14

- Release ID: `2026-04-10-r14`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: make finance history lookup and proof repair triage more direct without changing any receipt or billing rules.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only improves receipt-history search and repair-page grouping; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - `Receipt History / 收据历史` should support searching completed receipts and recent finance actions by student, course, receipt no., invoice no., or uploader
  - `Proof Repair / 凭证修复` should show separate quick-triage groups for `Missing payment record / 缺付款记录` and `Missing file on linked proof / 已关联但缺文件`
- Rollback point: previous production commit before `2026-04-10-r14`.

## 2026-04-10-r13

- Release ID: `2026-04-10-r13`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: make the split finance receipt flows easier to operate by surfacing the next best queue item and turning the package workspace into a clearer step-by-step handoff.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-parent-statement-of-account-and-receipt-export-clarity.md`
- Risk impact (if any): Low. This release only improves finance guidance and flow framing; it does not change invoice creation, receipt creation, approval rules, package balances, settlement logic, or deductions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - receipt queue screens should show a `Next best item / 下一条最该处理` card above the queue controls whenever there is an actionable row
  - the card should explain whether the next item is blocked by missing proof, missing file, prior rejection, or only needs a quick amount/detail check
  - package workspace should show `Step 1 Upload`, `Step 2 Check Records`, and `Step 3 Create Receipt` cards with clear done/current/next states
- Rollback point: previous production commit before `2026-04-10-r13`.

## 2026-04-10-r12

- Release ID: `2026-04-10-r12`
- Date/Time (Asia/Shanghai): `2026-04-10`
- Deployment status: `LIVE` after deploy completion
- Scope: clarify teacher-side and admin-side availability wording so everyone can clearly see that date slots are the real schedulable source and weekly templates are only generation helpers.
- Key files:
  - `app/teacher/availability/page.tsx`
  - `app/teacher/availability/TeacherAvailabilityClient.tsx`
  - `app/admin/teachers/[id]/availability/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260410-availability-wording-clarity.md`
- Risk impact (if any): Low. This release changes wording only; it does not change scheduling behavior, availability storage, finance logic, or permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher availability page should explain that date slots saved there are the real schedulable source
  - admin teacher availability page should explain that weekly templates only generate month date slots
- Rollback point: previous production commit before `2026-04-10-r12`.

## 2026-04-09-r11

- Release ID: `2026-04-09-r11`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: stop all real scheduling flows from falling back to weekly availability templates so only date-based availability can authorize scheduling, rescheduling, teacher replacement, appointment creation, and booking candidate generation.
- Key files:
  - `lib/teacher-scheduling-availability.ts`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/schedule/page.tsx`
  - `app/admin/classes/[id]/sessions/page.tsx`
  - `app/admin/teachers/[id]/availability/AdminTeacherAvailabilityClient.tsx`
  - `app/admin/teachers/[id]/availability/page.tsx`
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/classes/[id]/sessions/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/classes/[id]/sessions/reschedule/route.ts`
  - `app/api/admin/classes/[id]/sessions/replace-teacher/route.ts`
  - `app/api/admin/students/[id]/sessions/replace-teacher/route.ts`
  - `app/api/admin/sessions/[id]/replace-teacher/route.ts`
  - `app/api/admin/appointments/route.ts`
  - `app/api/admin/appointments/[id]/replace-teacher/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/api/admin/booking-links/candidates/route.ts`
  - `lib/booking.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-date-only-scheduling-availability.md`
- Risk impact (if any): Medium-low. This release intentionally tightens scheduling eligibility across multiple admin entry points and booking candidate generation; weekly templates still exist, but only as a helper to generate month date slots.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin teacher availability page should explain that only date slots are used for real scheduling
  - quick schedule should reject dates that have no date availability even if the teacher has a matching weekly template
  - booking candidate generation should only consider date availability rows inside the requested range
- Rollback point: previous production commit before `2026-04-09-r11`.

## 2026-04-09-r10

- Release ID: `2026-04-09-r10`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: clarify teacher availability inheritance so monthly availability cells no longer look unavailable when scheduling is still correctly falling back to the teacher's weekly template.
- Key files:
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/teachers/[id]/availability/AdminTeacherAvailabilityClient.tsx`
  - `app/admin/teachers/[id]/availability/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-availability-weekly-fallback-clarity.md`
- Risk impact (if any): Low. This release does not change the actual scheduling eligibility rules; it only makes the existing date-vs-weekly availability source much clearer in admin UI so ops do not mistake inherited weekly availability for forced scheduling.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin teacher availability month cells with no date override but matching weekly template should show `仍按每周模板可排`
  - quick schedule candidate status should show whether a teacher is available via `按每周模板可排` or `按日期时段可排`
- Rollback point: previous production commit before `2026-04-09-r10`.

## 2026-04-09-r08

- Release ID: `2026-04-09-r08`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: make the scheduling coordination console more actionable by showing availability-backed results directly against the latest parent submission, including matching slots when the family's submitted times already fit current teacher availability and nearest alternatives when they do not.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-availability-match-console.md`
- Risk impact (if any): Low. This release only enriches the scheduling-coordination operator console and candidate-slot filtering against parent-submitted availability; it does not change ticket tokens, quick schedule execution, session creation, attendance, packages, or finance logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin ticket detail for a submitted scheduling coordination item should show `availability 命中结果 / Availability-backed result`
  - if parent-submitted times already fit teacher availability, ticket detail should show matching slot cards with `Copy Message`
  - if there are no matches, ticket detail should show nearest alternative slot cards with `Copy Alternative`
  - student detail scheduling coordination card should continue to show only slots that fit the submitted parent availability
- Rollback point: previous production commit before `2026-04-09-r08`.

## 2026-04-09-r09

- Release ID: `2026-04-09-r09`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: make scheduling coordination feel more like a true operator state flow by adding a derived coordination phase, clearer next-step guidance, and one-click ticket progression for “options sent” and “teacher exception needed”.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `lib/scheduling-coordination.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-phase-flow-and-quick-progress-actions.md`
- Risk impact (if any): Low. This release only improves scheduling-coordination operator guidance, derived phase display, and ticket quick actions; it does not change tokens, parent form storage, quick schedule execution, session creation, attendance, package logic, or finance behavior.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = dea110a`
  - `https://sgtmanage.com/admin/login` returned `200`
  - live admin `/admin/tickets/[id]` for `赵测试` coordination item showed the new `Coordination phase / 协调阶段` summary
  - matching availability results exposed `Mark options sent / 标记已发候选时间`
  - live student detail scheduling coordination card for `赵测试` showed the new coordination controls and summary actions
  - `Todo Center` phase text was not re-verified against a live due item during this release because no current coordination reminder row was available to click in production
- Rollback point: previous production commit before `2026-04-09-r09`.

## 2026-04-09-r07

- Release ID: `2026-04-09-r07`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: turn scheduling coordination into a more usable operator console by adding parent-form link controls, structured latest-submission summaries, and direct parent-message copy actions from both the ticket detail page and the student detail coordination card.
- Key files:
  - `app/admin/_components/CopyTextButton.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `lib/parent-availability.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-scheduling-coordination-console-and-parent-message-actions.md`
- Risk impact (if any): Low. This release only improves scheduling-coordination presentation, copy/share actions, and parent-link regeneration around existing ticket/token flows; it does not change session creation, quick schedule core logic, attendance, package balances, or finance behavior.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin ticket detail should show a richer `Scheduling Coordination Console` with copy-link, copy-message, regenerate-link, and latest-parent-submission summary
  - student detail scheduling coordination card should show the same parent-link actions and structured latest parent submission details
  - suggested slot cards should expose `Copy Message` actions so ops can send suggested times to parents without rewriting them
- Rollback point: previous production commit before `2026-04-09-r07`.

## 2026-04-09-r06

- Release ID: `2026-04-09-r06`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: polish the external coordination touchpoints so Emily gets a clearer parent-link handoff panel after ticket submit and families see a simpler, more mobile-friendly availability form that explains the process more clearly.
- Key files:
  - `app/tickets/intake/IntakeForm.tsx`
  - `app/availability/[token]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-parent-availability-touchpoint-polish.md`
- Risk impact (if any): Low. This release only changes the intake success UI and the public parent-availability form presentation; it does not change token generation, ticket creation, parent submission storage, scheduling logic, or finance flows.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - Emily intake success state should show clearer copy/share guidance after creating a scheduling coordination ticket
  - parent `/availability/[token]` should load the new guidance blocks and the friendlier input layout
- Rollback point: previous production commit before `2026-04-09-r06`.

## 2026-04-09-r05

- Release ID: `2026-04-09-r05`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: fix the Emily intake success payload so generated parent availability links use the real production origin instead of an internal `localhost` host when running behind the server proxy.
- Key files:
  - `app/api/tickets/intake/[token]/route.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
- Risk impact (if any): Low. This release only fixes the absolute origin used for the returned parent form link; it does not change ticket creation, parent form storage, scheduling logic, or finance flows.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - creating a scheduling coordination ticket through the external intake link should now return a parent link under `https://sgtmanage.com/availability/...`
  - real `赵测试` intake QA should confirm the returned `parentAvailabilityUrl` no longer uses `localhost`
- Rollback point: previous production commit before `2026-04-09-r05`.

## 2026-04-09-r04

- Release ID: `2026-04-09-r04`
- Date/Time (Asia/Shanghai): `2026-04-09`
- Deployment status: `LIVE` after deploy completion
- Scope: let external intake operators create `Scheduling Coordination / 排课协调` tickets and immediately get a temporary parent availability link so families can submit lesson-time preferences without logging into the back office.
- Key files:
  - `app/api/tickets/intake/[token]/route.ts`
  - `app/tickets/intake/IntakeForm.tsx`
  - `app/tickets/intake/[token]/page.tsx`
  - `app/availability/[token]/page.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/todos/page.tsx`
  - `lib/parent-availability.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260409181306_add_parent_availability_requests/migration.sql`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260409-parent-availability-link-for-intake-scheduling-coordination.md`
- Risk impact (if any): Low to medium. This release adds a new lightweight link-token table and new public form route, but it does not change session creation, quick schedule core logic, attendance, package math, or finance flows.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - Emily-style ticket intake should allow `Scheduling Coordination / 排课协调` with a confirmed student and show a copyable parent availability link after submit
  - parent `/availability/[token]` should accept structured weekday/time submissions and show a success state without implying the lesson is already scheduled
  - submitted parent availability should appear on the linked admin ticket, student detail scheduling card, and `Todo Center`
- Rollback point: previous production commit before `2026-04-09-r04`.

## 2026-04-08-r07

- Release ID: `2026-04-08-r07`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: change online partner settlement from package-snapshot batching to purchase-batch settlement so each `PURCHASE` tranche can be billed independently, reverted back into queue, and exported with clear start/end dates.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/api/exports/partner-invoice/[id]/route.ts`
  - `lib/partner-settlement.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260408170000_partner_settlement_purchase_batches/migration.sql`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-partner-settlement-online-purchase-batch-pass.md`
- Risk impact (if any): Medium. This release changes online partner-settlement data shape and billing workflow, but only for `ONLINE_PACKAGE_END`; offline monthly settlement remains unchanged.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin `/admin/reports/partner-settlement` should show online rows by purchase batch, each with purchase date, start date, and end date
  - admin `/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END...` should invoice only the selected settlement items instead of bundling all pending online rows
  - reverting an online settlement should return that tranche to the queue instead of deleting it
  - partner invoice export should show `Course Start / Course End` when the selected online settlement items provide a date window
- Rollback point: previous production commit before `2026-04-08-r07`.

## 2026-04-08-r06

- Release ID: `2026-04-08-r06`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: replace the teacher-lead month board with a weekly calendar board and expand each day's sessions directly inside the day cell.
- Key files:
  - `app/teacher/lead/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-teacher-lead-week-calendar-expanded-days.md`
- Risk impact (if any): Low. This release only changes the teacher-lead schedule presentation; it does not change ACL rules, filter semantics, schedule data, finance logic, or admin permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/lead` should show a one-week calendar with each day expanded directly
- Rollback point: previous production commit before `2026-04-08-r06`.

## 2026-04-08-r05

- Release ID: `2026-04-08-r05`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: replace the teacher-column lead board with a month-calendar primary view so teacher leads can scan the whole month and then inspect the selected day below.
- Key files:
  - `app/teacher/lead/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-teacher-lead-month-calendar-board.md`
- Risk impact (if any): Low. This release only changes the teacher-lead schedule presentation; it does not change ACL rules, filter semantics, schedule data, finance logic, or admin permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/lead` should show a month calendar as the main board and a selected-day details section below
- Rollback point: previous production commit before `2026-04-08-r05`.

## 2026-04-08-r03

- Release ID: `2026-04-08-r03`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: make the new `Teacher Lead / 老师主管` page more visual by turning the all-teachers daily schedule into a calendar-like hourly day board while keeping the detailed table as a secondary expandable section.
- Key files:
  - `app/teacher/lead/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-teacher-lead-visual-day-board.md`
- Risk impact (if any): Low. This release only changes teacher-lead page presentation; it does not change ACL rules, filters, schedule data, finance logic, or any admin permissions.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/lead` should show `Visual day board / 日历板视图` with hourly schedule cards and an expandable detailed table below
- Rollback point: previous production commit before `2026-04-08-r03`.

## 2026-04-08-r02

- Release ID: `2026-04-08-r02`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: add the first `Teacher Lead / 老师主管` role pass as an additive teacher-side ACL so selected teachers can open a lead desk and review the all-teachers daily schedule without gaining admin-finance or system-control access.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260408093000_add_teacher_lead_acl/migration.sql`
  - `lib/auth.ts`
  - `app/api/admin/manager/teacher-leads/route.ts`
  - `app/api/admin/manager/teacher-leads/[id]/route.ts`
  - `app/admin/manager/users/page.tsx`
  - `app/admin/manager/users/_components/TeacherLeadEmailAddClient.tsx`
  - `app/admin/manager/users/_components/TeacherLeadEmailRemoveClient.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/lead/page.tsx`
  - `docs/tasks/TASK-20260408-teacher-lead-v1.md`
- Risk impact (if any): Low to medium. This release adds a new ACL table and a new teacher-side route, but keeps permissions narrow: teacher leads can only see the new lead desk and do not inherit admin finance, setup, or user-management privileges.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - owner-manager edit mode should show `Teacher Lead Access List / 老师主管名单维护`
  - teacher accounts on that ACL should see `Lead Desk / 主管工作台` and reach `/teacher/lead`
- Rollback point: previous production commit before `2026-04-08-r02`.

## 2026-04-08-r01

- Release ID: `2026-04-08-r01`
- Date/Time (Asia/Shanghai): `2026-04-08`
- Deployment status: `LIVE` after deploy completion
- Scope: align the teacher-side final-report writing form with the parent-facing PDF so teachers write in the same narrative order and wording families will later read.
- Key files:
  - `app/teacher/final-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260408-final-report-teacher-form-parent-pdf-alignment-pass.md`
- Risk impact (if any): Low. This release only changes teacher-side field labels, order, and explanatory copy; it does not change report storage, submission rules, PDF data sources, delivery/share logic, or any finance/attendance/package behavior.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - teacher `/teacher/final-reports/[id]` should show the parent-facing note and the softer family-facing section titles
- Rollback point: previous production commit before `2026-04-08-r01`.

## 2026-04-07-r09

- Release ID: `2026-04-07-r09`
- Date/Time (Asia/Shanghai): `2026-04-07`
- Deployment status: `LIVE` after deploy completion
- Scope: tighten the parent-facing `Final Report` PDF rules so draft reports no longer appear as formal family handoffs and empty final-level placeholders no longer print into the PDF.
- Key files:
  - `app/api/admin/final-reports/[id]/pdf/route.ts`
  - `app/admin/reports/final/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260407-final-report-pdf-submission-gate-and-empty-level-pass.md`
- Risk impact (if any): Low. This release only changes PDF availability and empty-state rendering for final reports; it does not change teacher drafting, report data storage, delivery/share flows, or any finance/attendance/package logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin final-report rows should show `Download PDF` only for `SUBMITTED` or `FORWARDED` reports
  - reports without `Final level / 最终水平` should no longer print the `Added by teacher / 由老师填写` placeholder in the PDF
- Rollback point: previous production commit before `2026-04-07-r09`.

## 2026-04-06-r12

- Release ID: `2026-04-06-r12`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: tune only the admin sidebar group colors so `Today / Core Workflows / Finance & Review / Setup & Control / Reports` are easier to distinguish while keeping the sidebar simple.
- Key files:
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-admin-sidebar-color-tuning-pass.md`
- Risk impact (if any): Low. This release only adjusts sidebar color tokens; it does not change routes, permissions, queue logic, or any business workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar groups should remain simple while `Core Workflows` reads more clearly via color separation alone
- Rollback point: previous production commit before `2026-04-06-r12`.

## 2026-04-06-r11

- Release ID: `2026-04-06-r11`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: simplify the `Core Workflows / 核心流程` sidebar pass by removing the extra item-level copy while keeping the stronger group color distinction and simpler section summary.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-admin-core-workflows-simplify-followup.md`
- Risk impact (if any): Low. This release only trims sidebar copy and emphasis styling; it does not change routes, permissions, queue logic, or any student/finance/teaching workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should keep the stronger group colors while `Core Workflows / 核心流程` returns to a simpler label-first list
- Rollback point: previous production commit before `2026-04-06-r11`.

## 2026-04-06-r10

- Release ID: `2026-04-06-r10`
- Date/Time (Asia/Shanghai): `2026-04-06`
- Deployment status: `LIVE` after deploy completion
- Scope: make `Core Workflows / 核心流程` read more clearly as the main operator zone by adding task-oriented descriptions, stronger primary-item emphasis, and a more distinct group style.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260406-admin-core-workflows-clarity-pass.md`
- Risk impact (if any): Low. This release only changes admin sidebar copy, emphasis, and grouping presentation; it does not change routes, permissions, queue logic, or any business workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should show clearer descriptions and stronger emphasis for `Students / Enrollments / Packages / Ticket Center` under `Core Workflows / 核心流程`
- Rollback point: previous production commit before `2026-04-06-r10`.

## 2026-04-04-r09

- Release ID: `2026-04-04-r09`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: regroup `SOP One Pager / SOP一页纸` into `Core Workflows / 核心流程`, move `Undeducted Completed / 已完成未减扣` into `Reports / 报表`, and strengthen admin sidebar group hierarchy so each section is easier to scan.
- Key files:
  - `app/admin/layout.tsx`
  - `app/admin/AdminSidebarNavClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-admin-sidebar-regroup-and-visual-pass.md`
- Risk impact (if any): Low. This release only changes admin sidebar grouping and visual emphasis; it does not change permissions, routes, queue logic, reporting calculations, or any business workflow.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should show `SOP One Pager / SOP一页纸` under `Core Workflows / 核心流程`
  - admin sidebar should show `Undeducted Completed / 已完成未减扣` under `Reports / 报表`
- Rollback point: previous production commit before `2026-04-04-r09`.

## 2026-04-04-r08

- Release ID: `2026-04-04-r08`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: move `Monthly Schedule / 月课表总览` from the admin `Reports` sidebar group into `Today / 今天` so operators can reach the month schedule from the day-first workspace cluster.
- Key files:
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-admin-nav-monthly-schedule-to-today.md`
- Risk impact (if any): Low. This release only changes admin sidebar grouping and link placement; it does not change schedule data, report logic, permissions, or any finance/teaching workflows.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned
  - `https://sgtmanage.com/admin/login` must return `200`
  - admin sidebar should show `Monthly Schedule / 月课表总览` under `Today / 今天`, no longer under `Reports / 报表`
- Rollback point: previous production commit before `2026-04-04-r08`.

## 2026-04-04-r07

- Release ID: `2026-04-04-r07`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: fix the packages workbench "Back to default workbench" shortcuts so they actually clear remembered filters instead of reloading the same remembered package state.
- Key files:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-packages-default-workbench-clearfix.md`
- Risk impact (if any): Low. This release only changes package workbench reset links to use the explicit remembered-filter clear path; it does not change package filtering rules, billing, ledger, top-up, or package edit/delete logic.
- Verification:
  - `npm run build` passed
  - targeted QA reproduced the bug on production: `/admin/packages` resumed remembered `paid=unpaid`, and the banner shortcut still pointed to bare `/admin/packages`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = a4568df`
  - `https://sgtmanage.com/admin/login` returned `200`
  - post-deploy QA confirmed `Back to default workbench` now lands on `?clearFilters=1`, hides the resumed-filters banner, and resets `Payment / 付款` from remembered `unpaid` back to `All / 全部`
- Rollback point: previous production commit before `2026-04-04-r07`.

## 2026-04-04-r06

- Release ID: `2026-04-04-r06`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: hotfix the remaining student-detail `edit-student` id collision so explicit edit focus returns target the real edit details block.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-edit-id-collision-hotfix.md`
- Risk impact (if any): Low. This release only removes an id collision in the student-detail edit section; it does not change student save/delete behavior or any scheduling, attendance, package, billing, or reporting logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 5967863`
  - `https://sgtmanage.com/admin/login` returned `200`
  - targeted live QA confirmed `focus=edit-student#edit-student` now hits a single `DETAILS` target and leaves it open (`editCount = 1`, `editOpen = true`)
- Rollback point: previous production commit before `2026-04-04-r06`.

## 2026-04-04-r05

- Release ID: `2026-04-04-r05`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: hotfix the remaining student-detail explicit-focus gap so `Edit Student / 编辑学生` stays open when operators return with `focus=edit-student`.
- Key files:
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-edit-open-hotfix.md`
- Risk impact (if any): Low. This release only stabilizes the client-side open state for the edit-student details block; it does not change student save/delete behavior or any scheduling, attendance, package, billing, or reporting logic.
- Verification:
  - `npm run build` passed
  - `npm run build` passed
  - post-deploy startup check confirmed `local / origin / server = 9c86c41`
  - `https://sgtmanage.com/admin/login` returned `200`
  - follow-up QA found a remaining DOM id collision on `edit-student`, so `r05` should be treated as a partial hotfix only
- Rollback point: previous production commit before `2026-04-04-r05` (`ea9779d`).

## 2026-04-04-r04

- Release ID: `2026-04-04-r04`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: refine student-detail first-render section state so explicit focus returns open packages, enrollments, quick schedule, and edit flows in the right work area without waiting for client-side recovery.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-focus-open-pass.md`
- Risk impact (if any): Low. This release only improves student-detail first-render section state and return targeting; it does not change scheduling, attendance, package, billing, or student data rules.
- Verification:
  - `npm run build` passed
  - post-deploy startup check confirmed `local / origin / server = 64040e5`
  - `https://sgtmanage.com/admin/login` returned `200`
  - operator click-through should confirm explicit `focus` returns open `Packages / Enrollments / Quick Schedule / Edit Student` on first render
- Rollback point: previous production commit before `2026-04-04-r04` (`28a62bd`).

## 2026-04-04-r03

- Release ID: `2026-04-04-r03`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: reopen the correct student-detail workbench section from hash-driven returns so packages, attendance, and edit flows stay usable after refreshes and same-page redirects.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/studentDetailHash.ts`
  - `app/admin/students/[id]/_components/StudentDetailHashStateClient.tsx`
  - `app/admin/_components/StudentAttendanceFilterForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-section-open-state-pass.md`
- Risk impact (if any): Low. This release only improves student-detail section reopening and hash return behavior; it does not change scheduling, attendance, package, billing, or student data rules.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = b3ce26b`
  - `https://sgtmanage.com/admin/login` returned `200`
  - the shared student-detail hash restore layer now reopens matching `<details>` blocks for hash-driven returns; targeted operator click-through should confirm `Packages / Attendance / Edit Student` stay reopened in live use
- Rollback point: previous production commit before `2026-04-04-r03`.

## 2026-04-04-r02

- Release ID: `2026-04-04-r02`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: keep the student-detail calendar section expanded when switching months so the planning workbench stays open after `Prev Month / Next Month`.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-calendar-open-hotfix.md`
- Risk impact (if any): Low. This release only preserves calendar view state on the student-detail page; it does not change quick scheduling, attendance, deduction, package, or billing logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 29b623a`
  - production `https://sgtmanage.com/admin/login` returned `200`
  - the hotfix now carries `calendarOpen=1` on student-detail month navigation so server render keeps `Planning tools & calendar` expanded across month switches; browser click-through should be confirmed in the next operator pass
- Rollback point: previous production commit before `2026-04-04-r02`.

## 2026-04-04-r01

- Release ID: `2026-04-04-r01`
- Date/Time (Asia/Shanghai): `2026-04-04`
- Deployment status: `LIVE` after deploy completion
- Scope: keep the admin student detail page anchored to the current section after same-page actions and refreshes so operations do not get dropped back at the top of the workbench.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/students/[id]/_components/studentDetailHash.ts`
  - `app/admin/students/[id]/_components/SessionCancelRestoreClient.tsx`
  - `app/admin/students/[id]/_components/SessionReplaceTeacherClient.tsx`
  - `app/admin/students/[id]/_components/StudentEditClient.tsx`
  - `app/admin/_components/QuickScheduleModal.tsx`
  - `app/admin/_components/StudentAttendanceFilterForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260404-student-detail-section-return-fix.md`
- Risk impact (if any): Low. This release only changes student-detail navigation and same-page section return behavior; it does not change student data, scheduling, attendance, deduction, package, or billing business logic.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server = 14d5980` and `https://sgtmanage.com/admin/login` returned `200`
  - post-deploy `curl -I https://sgtmanage.com/admin/login` returned `200`
  - targeted student-detail validation confirmed the fix covers calendar navigation, quick-schedule links, attendance filter routing, and same-page refresh helpers for edit / cancel / replace-teacher flows
- Rollback point: previous production commit before `2026-04-04-r01`.

## 2026-04-03-r27

- Release ID: `2026-04-03-r27`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an `Archive / 归档` layer to Midterm Reports and Final Reports so completed or exempt report records can leave the active desks without losing audit history.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260404004000_add_report_archive_metadata/migration.sql`
  - `lib/final-report.ts`
  - `lib/midterm-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/admin/reports/midterm/page.tsx`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-report-archive-phase-1.md`
- Risk impact (if any): Medium-low. This ship adds report archive metadata and new admin-only archive/restore transitions, but it does not change report submission content, parent delivery/share logic, finance flows, attendance/package math, or existing exempt semantics.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm admin `Final Report Center` and `Midterm Report Center` show `Archived`, and teacher report lists continue hiding archived items
- Rollback point: previous production commit before `2026-04-03-r27`.

## 2026-04-03-r26

- Release ID: `2026-04-03-r26`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an `EXEMPT / 无需报告` path to Midterm Reports so operations can remove no-report midpoint tasks from both the admin and teacher queues without assigning or keeping teacher work open.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260404000500_add_midterm_report_exempt_status/migration.sql`
  - `lib/midterm-report.ts`
  - `app/admin/reports/midterm/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-midterm-report-exempt-phase-1.md`
- Risk impact (if any): Medium-low. This ship adds a Prisma enum/schema migration and new admin-only status transitions on Midterm Reports, but it does not change final reports, package progress math, attendance, finance flows, teacher submission rules for non-exempt reports, or existing forwarded-lock behavior.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm admins can see `Exempt` in `/admin/reports/midterm`, candidate rows expose `Mark exempt`, and teacher `/teacher/midterm-reports` excludes exempt items
- Rollback point: previous production commit before `2026-04-03-r26`.

## 2026-04-03-r25

- Release ID: `2026-04-03-r25`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an `EXEMPT / 无需报告` path to Final Reports so operations can remove no-report packages from the final-report queue without pushing work to teachers first.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403235500_add_final_report_exempt_status/migration.sql`
  - `lib/final-report.ts`
  - `app/admin/reports/final/page.tsx`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-report-exempt-phase-1.md`
- Risk impact (if any): Medium-low. This ship adds a Prisma enum/schema migration and new admin-only status transitions on Final Reports, but it does not change midterm reports, package completion math, attendance, finance flows, or teacher submission rules for non-exempt reports.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm admins can see `Exempt` in `/admin/reports/final`, candidate rows expose `Mark exempt`, and exempted reports disappear from `/teacher/final-reports`
- Rollback point: previous production commit before `2026-04-03-r25`.

## 2026-04-03-r18

- Release ID: `2026-04-03-r18`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: fix the admin packages workbench so explicitly clearing payment/course/search filters no longer gets overridden by remembered filters, and the `Clear` action truly resets the desk.
- Key files:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-packages-filter-clear-fix.md`
- Risk impact (if any): Low. This ship only fixes filter-state parsing on the packages workbench; package creation, editing, top-up, billing, ledger, remembered-flow cards, and package business logic remain unchanged.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm `paid=unpaid -> all` can return to `All Payment Status` and `clearFilters=1` no longer shows resumed remembered filters
- Rollback point: previous production commit before `2026-04-03-r18`.

## 2026-04-03-r17

- Release ID: `2026-04-03-r17`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: move the student package month-end balance report off the invoice workbench into its own finance page so reporting and invoice issuance stay separate.
- Key files:
  - `app/admin/finance/student-package-balances/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-balance-report-separate-page.md`
- Risk impact (if any): Low. This ship only moves the existing read-only month-end balance report UI into its own finance route and adds navigation links; report math, CSV export behavior, package ledger basis logic, invoice issuance, receipts, approvals, and finance permissions remain unchanged.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
  - production read-only QA must confirm `/admin/finance/student-package-balances` renders the report and `/admin/finance/student-package-invoices` now shows only the jump card
- Rollback point: previous production commit before `2026-04-03-r17`.

## 2026-04-03-r16

- Release ID: `2026-04-03-r16`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: make the month-end balance report’s amount-basis source easier to scan by turning the source labels into color-coded badges and adding a small on-page legend.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-badges.md`
- Risk impact (if any): Low. This is a student-billing presentation-only pass; the report calculation, export route, package ledger writes, billing flow, and finance approval behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
- Rollback point: previous production commit before `2026-04-03-r16`.

## 2026-04-03-r15

- Release ID: `2026-04-03-r15`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: upgrade the student-billing month-end balance report to use purchase-ledger amount history when available, while keeping safe fallbacks for older packages without amount deltas.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403173000_add_package_txn_delta_amount/migration.sql`
  - `app/api/admin/packages/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/packages/[id]/route.ts`
  - `app/api/admin/packages/[id]/ledger/txns/[txnId]/route.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `app/admin/packages/[id]/ledger/PackageLedgerEditTxnClient.tsx`
  - `lib/student-package-month-end-balance.ts`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-ledger-basis.md`
- Risk impact (if any): Medium. This ship includes a Prisma schema migration plus `PURCHASE` write-path updates for packages and top-ups, but it does not change deduction behavior, package remaining-minute math, billing approvals, or finance workflow rules. Old packages still fall back safely when purchase amount history is incomplete.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - deploy-time `npx prisma migrate deploy` is expected through the existing server deploy flow
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` must confirm `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returns `200`
- Rollback point: previous production commit before `2026-04-03-r15`.

## 2026-04-03-r14

- Release ID: `2026-04-03-r14`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add an inline preview table and summary cards to the new student-billing month-end balance report so finance can inspect the report before exporting CSV.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-preview.md`
- Risk impact (if any): Low. This ship only adds a read-only preview on the same month-end balance basis already used by the export; package deductions, receipts, invoices, approvals, and the CSV calculation path remain unchanged.
- Verification:
  - `npm run build` passed
  - page-level verification confirmed the month-end report block now renders summary cards plus the first 12 rows inline while keeping the same export link
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-03-r14`.

## 2026-04-03-r13

- Release ID: `2026-04-03-r13`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add a read-only month-end balance export under student billing so finance can export remaining package balance in hours and estimated amount as of a selected month end.
- Key files:
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/api/exports/student-package-month-end-balance/route.ts`
  - `lib/student-package-month-end-balance.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-student-package-month-end-balance-report.md`
- Risk impact (if any): Low to medium. This ship is read-only and does not change any package, billing, receipt, or approval logic, but version 1 amount is a management estimate based on receipt totals up to month end or fallback package paid amount, not an audit-grade historical price ledger.
- Verification:
  - `npm run build` passed
  - local logged-in QA on `http://127.0.0.1:3322/admin/finance/student-package-invoices?balanceMonth=2026-03` confirmed the new month-end report block renders in student billing
  - local export QA on `http://127.0.0.1:3322/api/exports/student-package-month-end-balance?month=2026-03` returned `200` and generated CSV headers plus package rows
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-03-r13`.

## 2026-04-03-r11

- Release ID: `2026-04-03-r11`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: continue the teacher-side UI clarity pass on the teacher card, midterm reports, and payroll desk so not-linked/empty states and primary actions read consistently across the portal.
- Key files:
  - `app/teacher/card/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-card-midterm-payroll-clarity-pass.md`
- Risk impact (if any): Low. This ship only changes empty-state presentation, action emphasis, and next-step guidance on four existing teacher pages; no teacher intro save logic, card export logic, report save/submit behavior, report locking rules, payroll calculations, payroll confirmation rules, or payout workflow changed.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the new teacher-card guidance, midterm empty-state/action hierarchy, and payroll clear/error-state improvements on the same routes
- Rollback point: previous production commit before `2026-04-03-r11`.

## 2026-04-03-r10

- Release ID: `2026-04-03-r10`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: continue the teacher-side UI clarity pass on expense claims and sign-in alerts so empty states explain the next step and the main action is easier to spot.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/alerts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-expense-and-alerts-clarity-pass.md`
- Risk impact (if any): Low. This ship only changes button emphasis, empty-state guidance, and next-step navigation on two existing teacher workbench pages; no expense submit/resubmit/withdraw rules, attachment logic, alert sync, quick-mark behavior, attendance handling, or feedback-overdue detection changed.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the new expense empty-state/filter hierarchy and the new alerts empty-state/action hierarchy on the same routes
- Rollback point: previous production commit before `2026-04-03-r10`.

## 2026-04-03-r09

- Release ID: `2026-04-03-r09`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the next teacher-side clarity pass on the student feedback desk and ticket board so empty states explain the next step and primary actions stand out more clearly.
- Key files:
  - `app/teacher/student-feedbacks/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-feedbacks-and-tickets-clarity-pass.md`
- Risk impact (if any): Low. This ship only changes empty-state presentation, filter/button emphasis, and next-step guidance on two existing teacher workbench pages; no feedback timeline logic, unread-marking behavior, handoff-risk filters, ticket proof-file behavior, ticket completion rules, or ticket status transitions changed.
- Verification:
  - `npm run build` passed
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-03-r09`.

## 2026-04-03-r08

- Release ID: `2026-04-03-r08`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the next UI clarity pass on admin feedbacks, packages, and partner settlement so button hierarchy is easier to scan and empty states explain the next logical action.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/packages/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-button-hierarchy-and-empty-states-pass-2.md`
- Risk impact (if any): Low. This ship only changes button emphasis and empty-state guidance on three existing admin workbench pages; no feedback forwarding logic, proxy-draft behavior, package CRUD/top-up logic, settlement calculations, settlement creation rules, invoice history logic, or revert semantics changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3336` confirmed:
    - `/admin/feedbacks?status=pending&studentId=missing-student` renders the new empty-state guidance and the stronger filter apply/clear hierarchy
    - `/admin/packages?q=__nomatch__` renders the new filtered-empty-state guidance plus the stronger filter apply/clear hierarchy
    - `/admin/reports/partner-settlement?month=1999-01` renders the new empty-state guidance, and `/admin/reports/partner-settlement` still renders the stronger primary/danger action hierarchy
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the same new empty-state guidance and button hierarchy on the same three pages
- Rollback point: previous production commit before `2026-04-03-r08`.

## 2026-04-03-r07

- Release ID: `2026-04-03-r07`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Improve button hierarchy and empty-state guidance on teacher payroll, expense claims, and receipt approvals so users can tell the next safe action faster without changing any workflow logic.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-button-hierarchy-and-empty-states.md`
- Risk impact (if any): Low. This ship only changes button emphasis and empty-state guidance on three existing workbench pages; no payroll calculations, payroll confirmation rules, expense approval logic, receipt approval order, payout behavior, or attachment business rules changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3335` confirmed:
    - `/teacher/payroll?month=2099-01&scope=all` renders the new payroll-not-available empty state with direct dashboard and expense-claims links
    - `/admin/expense-claims?status=SUBMITTED&month=1999-01` renders the new empty-queue guidance and `/admin/expense-claims` still renders the updated primary/danger action hierarchy
    - `/admin/receipts-approvals?month=1999-01` renders the new empty-queue and no-selection guidance, and `/admin/receipts-approvals` still renders the updated primary/secondary/danger action hierarchy
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the same new empty-state guidance and button hierarchy on the same three pages
- Rollback point: previous production commit before `2026-04-03-r07`.

## 2026-04-03-r06

- Release ID: `2026-04-03-r06`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run a fourth admin copy-clarity pass on the teacher payroll desk, the student package invoice workbench, and the attachment health desk so finance-facing labels and guidance read more naturally without changing any workflow logic.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
  - `app/admin/recovery/uploads/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-4.md`
- Risk impact (if any): Low. This ship only rewrites visible copy on three existing admin workbench pages; no payroll calculations, payout permissions, invoice creation rules, attachment recovery behavior, or file-routing logic changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3334` confirmed:
    - `/admin/reports/teacher-payroll` renders the new workflow-state, explainer, and payout-group wording
    - `/admin/finance/student-package-invoices` renders the new workbench title, preview explanation, form labels, and invoice-table headings
    - `/admin/recovery/uploads` renders the new attachment-health hero, shortcut, restore, and table copy
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production shows the same new copy on the same three pages
- Rollback point: previous production commit before `2026-04-03-r06`.

## 2026-04-03-r05

- Release ID: `2026-04-03-r05`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the third admin copy-clarity pass on the admin ticket center, finance workbench, and teacher payroll detail page so high-traffic bilingual labels read more naturally without changing any workflow logic.
- Key files:
  - `app/admin/tickets/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-3.md`
- Risk impact (if any): Low. This ship only rewrites UI copy and a redundant table header on three existing admin pages; no ticket workflow rules, finance workbench routing or reminder behavior, payroll math, completion rules, or approval logic changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3333` confirmed:
    - `/admin/tickets` renders the new management-focus, intake-link, queue, and completion-note wording
    - `/admin/finance/workbench` renders the new search/filter, reminder-preview, and reminder-detail wording
    - `/admin/reports/teacher-payroll/[teacherId]` renders the new back-link, scope, anomaly-filter, and payroll-period wording
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production:
    - `/admin/tickets` shows the new ticket-center wording on banners, intake links, and action fields
    - `/admin/finance/workbench` shows the new finance search/filter labels and reminder-detail wording
    - `/admin/reports/teacher-payroll/[teacherId]` shows the new payroll-detail scope/filter copy and the corrected combo-summary header row
- Rollback point: previous production commit before `2026-04-03-r05`.

## 2026-04-03-r04

- Release ID: `2026-04-03-r04`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: Run the second bilingual copy-clarity pass on teacher tickets, admin teacher payroll, and partner settlement billing so high-traffic labels read more naturally without changing any workflow logic.
- Key files:
  - `app/teacher/tickets/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-2.md`
- Risk impact (if any): Low. This ship only rewrites UI copy on three existing workbench pages; no ticket write rules, payroll math or approval behavior, partner billing flows, invoice/receipt actions, or storage logic changed.
- Verification:
  - `npm run build` passed
  - logged-in local QA on `http://127.0.0.1:3332` confirmed:
    - `/teacher/tickets` renders the new ticket search, status-filter, proof-file, and completion-note copy
    - `/admin/reports/teacher-payroll` renders the new scope labels, jump links, queue wording, and summary-card copy
    - `/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END&month=2026-03&tab=payments` renders the new payment/receipt/billing wording
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `313f3ba` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production:
    - `/teacher/tickets` shows `Search ticket no., student, or teacher` and `All statuses`
    - `/admin/reports/teacher-payroll` shows the new payroll-period, queue, and jump-link copy
    - `/admin/reports/partner-settlement/billing` shows the new payment-record, receipt, and export wording
- Rollback point: previous production commit before `2026-04-03-r04`.

## 2026-04-02-r15

- Release ID: `2026-04-02-r15`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last admin packages filter set so operators can reopen the same package workbench context without rebuilding it.
- Key files:
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-packages-filter-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores the package workbench filters on first open when no explicit URL params are provided; no package edit rules, top-up math, billing logic, ledger logic, or focus-return behavior changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3318` confirmed:
    - `/admin/packages` restores `q=赵&paid=unpaid&warn=alert` from cookie when the page is opened without URL params
    - the resumed-filter banner renders on the plain workbench-open path
    - the resumed-filter banner does not appear on `packageFlow=deleted` return pages, while the delete flow card still renders
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/packages` restores the remembered filter set and still suppresses the resume banner on package-flow return pages
- Rollback point: previous production commit before `2026-04-02-r15`.

## 2026-04-02-r14

- Release ID: `2026-04-02-r14`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last admin partner-settlement month/history/panel view so operators can reopen the same workbench context without rebuilding it.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-partner-settlement-view-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores the partner-settlement workbench view on first open when no explicit URL params are provided; no settlement math, settlement creation rules, invoice generation, revert semantics, or approval behavior changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3317` confirmed:
    - `/admin/reports/partner-settlement` restores `month=2026-03&history=receipt-created&panel=history` from cookie when the page is opened without URL params
    - `/admin/reports/partner-settlement` restores `month=2026-03&panel=setup` and now opens the setup disclosure when resumed
    - the resumed-view banner renders on the plain queue-open path and does not appear on `settlementFlow=rate-updated` return pages
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/reports/partner-settlement` restores the remembered month/history/panel view and still suppresses the resume banner on settlement-flow return pages
- Rollback point: previous production commit before `2026-04-02-r14`.

## 2026-04-02-r13

- Release ID: `2026-04-02-r13`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last admin feedback queue and student scope so operators can reopen the same feedback desk context without rebuilding it.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-feedbacks-queue-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores the admin feedback desk queue/student scope on first open when no explicit URL params are provided; no feedback write rules, forward-mark rules, proxy-draft behavior, teacher workflows, or focus-return logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3316` confirmed:
    - `/admin/feedbacks` restores `status=pending` from cookie when the page is opened without URL params
    - `/admin/feedbacks` restores `status=pending&studentId=b54eae8f-461f-4aae-9a22-8ec7a1033c8a` from cookie when the page is opened without URL params
    - the resumed queue banner renders only on the plain queue-open path and does not appear on `feedbackFlow=forwarded` return pages
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the deployed release commit and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed production `/admin/feedbacks` restores the remembered queue/student scope when opened without explicit URL params and still suppresses the resume banner on feedback-flow return pages
- Rollback point: previous production commit before `2026-04-02-r13`.

## 2026-04-02-r12

- Release ID: `2026-04-02-r12`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Remember the last queue/filter state on admin receipt approvals and expense claims so operators can reopen the same working dataset without rebuilding it.
- Key files:
  - `app/admin/_components/RememberedWorkbenchQueryClient.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-queue-memory.md`
- Risk impact (if any): Low. This ship only remembers and restores queue/filter context on finance workbench pages; no approval order, selected-item logic, receipt creation rules, expense approval rules, payout logic, or attachment business logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed:
    - receipts approvals restores `queueFilter=FILE_ISSUE&queueBucket=OPEN` from cookie when the page is opened without URL params
    - expense claims restores `approvedUnpaidOnly=1&currency=SGD` from cookie when the page is opened without URL params
    - both pages show an explicit “resumed last queue/filter” hint plus a direct return-to-default link
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `0ff6b71` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed receipts approvals restores `queueFilter=FILE_ISSUE&queueBucket=OPEN` from cookie on production when the page is opened without URL params
  - logged-in live QA confirmed expense claims restores `approvedUnpaidOnly=1&currency=SGD` from cookie on production when the page is opened without URL params
- Rollback point: previous production commit before `2026-04-02-r12`.

## 2026-04-02-r11

- Release ID: `2026-04-02-r11`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the same context-return and next-step shortcut pattern to the admin partner settlement workspace so rate edits and settlement creation / revert actions keep operators oriented.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-partner-settlement-context-return.md`
- Risk impact (if any): Low. This ship only changes post-action navigation, focus anchors, and flow-card guidance on the admin partner settlement page; no settlement rate values, online/offline settlement creation rules, revert semantics, billing rules, or payout calculations changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3315` confirmed:
    - `online-created` flow shows `Online settlement record created.` plus `Open billing workspace / Open next online item`
    - `offline-created` flow shows `Offline settlement record created.` plus `Open billing workspace / Open next offline item`
    - `settlement-reverted` flow shows `Settlement record reverted.` plus `Back to online queue / Back to offline queue`
    - `rate-updated` flow shows `Settlement rates updated.` plus `Jump to setup / Back to live queue`
    - `focusType=online` and `focusType=offline` both land on stable highlighted queue rows with `partner-online-*` / `partner-offline-*` anchors
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on `294e118` and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed the same `online-created`, `offline-created`, `settlement-reverted`, and `rate-updated` flow cards render on production for `month=2026-04`
  - logged-in live QA confirmed both `partner-online-*` and `partner-offline-*` focus-row anchors render on production and still expose `Create online settlement / Create offline settlement`
- Rollback point: previous production commit before `2026-04-02-r11`.

## 2026-04-02-r10

- Release ID: `2026-04-02-r10`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the same context-return pattern to the admin packages workbench so package edit, top-up, and delete actions keep operators oriented.
- Key files:
  - `app/admin/packages/page.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-packages-context-return.md`
- Risk impact (if any): Low. This ship only changes post-action navigation, highlight anchors, and next-step shortcuts on the admin packages page; no package edit rules, top-up math, delete behavior, billing logic, or ledger logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3314` confirmed:
    - `edited` flow shows `Package changes saved.` plus `Jump to this package / Open billing / Open ledger`
    - `topup` flow shows `Top-up saved.` plus `Jump to updated balance / Open billing / Open ledger`
    - `deleted` flow shows `Package deleted.` plus `Open next visible package`
  - source verification confirmed package rows now render stable `package-row-*` anchors and focus styling when return params are present
- Rollback point: previous production commit before `2026-04-02-r10`.

## 2026-04-02-r09

- Release ID: `2026-04-02-r09`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add context-return and focus highlighting to the admin feedback desk so forwarded and proxy-draft actions keep operators oriented.
- Key files:
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/feedbacks/MarkForwardedFormClient.tsx`
  - `app/admin/feedbacks/ProxyDraftFormClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-feedbacks-context-return.md`
- Risk impact (if any): Low. This ship only changes post-action navigation, card highlighting, and focus anchors on the admin feedback desk; no feedback write rules, forward-mark rules, proxy-draft persistence, or teacher workflows changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3313` confirmed the forwarded flow card appears with `Open next pending item`
  - fresh local logged-in QA confirmed forwarded/proxy return URLs keep the expected queue-return links when the focused item is not visible
  - source verification confirmed stable anchors now render for feedback cards and overdue-session cards
- Rollback point: previous production commit before `2026-04-02-r09`.

## 2026-04-02-r08

- Release ID: `2026-04-02-r08`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add one more finance follow-up layer so repair-return cards can jump directly to approval or payment areas when the selected item is ready.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-next-action-shortcuts.md`
- Risk impact (if any): Low. This ship only adds anchor shortcuts and conditional next-step links around existing finance return cards; no approval order, payout batching logic, receipt creation rule, or attachment business logic changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3313` confirmed receipt approvals still shows the unresolved-state safety links (`Open fix tools again`, `Stay on this receipt`) when the selected receipt is not ready yet
  - fresh local logged-in QA on `http://127.0.0.1:3313` confirmed expense claims still shows `Back to selected claim` and `Open all attachment issues` for unresolved repair-return states
  - source verification confirmed the resolved-state paths now include direct anchors to `#receipt-primary-actions`, `#expense-review-actions`, and `#expense-payment-details`
- Rollback point: previous production commit before `2026-04-02-r08`.

## 2026-04-02-r07

- Release ID: `2026-04-02-r07`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Finish the second finance repair-loop pass so receipt proof repairs and expense-claim attachment cleanup return to a clearer ready-to-review state.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-repair-loop-phase-2.md`
- Risk impact (if any): Low. This ship only changes finance repair-result messaging and return-path presentation; no approval order, payout batching, receipt creation rule, attachment storage rule, or business workflow transition changed.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3311` confirmed receipt approvals now shows the localized proof-repair success label plus the new repair follow-up state card after returning to the selected receipt
  - fresh local logged-in QA on `http://127.0.0.1:3311` confirmed expense claims now shows the repair-loop card with `Back to selected claim` and `Open all attachment issues` when return-context params are present
- Rollback point: previous production commit before `2026-04-02-r07`.

## 2026-04-02-r06

- Release ID: `2026-04-02-r06`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Tighten finance repair-loop navigation, restore remembered student queues on first paint, and add clearer teacher session status summaries.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-repair-loop-and-queue-resume.md`
- Risk impact (if any): Low. This ship only adjusts navigation return paths, remembered-view presentation, and teacher page summaries; no approval order, receipt creation rules, student data rules, attendance submission logic, or feedback submission logic changed.
- Verification:
  - `npm run build` passed
  - local logged-in QA confirmed admin students restores the remembered queue on first render and shows the new resume banner / `Switch to today queue` escape hatch when no explicit `view` is provided
  - local logged-in QA confirmed admin receipt approvals package workspace now carries `nextHref` through upload/delete/create repair flows and keeps the selected receipt return path visible
  - local logged-in QA confirmed teacher session detail now shows `Attendance status / Feedback status / Next action` summary cards while preserving the existing `Step 1 / Step 2` guidance
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the release branch and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-02-r06`.

## 2026-04-02-r05

- Release ID: `2026-04-02-r05`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Shorten the finance attachment-repair path on admin expense claims and receipt approvals without changing approval logic.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-finance-attachment-repair-path.md`
- Risk impact (if any): Low. This ship adds stronger repair-entry cards and shortcut links around existing attachment-issue states, but does not change approval order, queue data, payment rules, receipt creation, or expense-claim workflow logic.
- Verification:
  - `npm run build` passed
  - admin expense claims now shows an explicit `Attachment repair path / 附件修复路径` card whenever the selected review item is missing its file
  - admin expense claims finance payout groups now expose direct repair/history shortcuts when any claim in the selected batch has attachment issues
  - admin receipt approvals now shows an explicit `Proof repair path / 凭证修复路径` card above the receipt detail area whenever proof is missing or the linked file is gone
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the release branch and `https://sgtmanage.com/admin/login` returned `200`
- Rollback point: previous production commit before `2026-04-02-r05`.

## 2026-04-02-r04

- Release ID: `2026-04-02-r04`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add targeted admin/teacher UX follow-ups plus a shared local business-file-storage layer for expense claims, payment proofs, shared docs local fallback, and ticket attachments.
- Key files:
  - `lib/business-file-storage.ts`
  - `lib/expense-claim-files.ts`
  - `lib/shared-doc-files.ts`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/billing/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/admin/tickets/[id]/page.tsx`
  - `app/admin/tickets/archived/page.tsx`
  - `app/api/admin/expense-claims/route.ts`
  - `app/api/admin/parent-payment-records/[id]/file/route.ts`
  - `app/api/expense-claims/[id]/receipt/route.ts`
  - `app/api/shared-docs/[id]/file/route.ts`
  - `app/api/teacher/expense-claims/route.ts`
  - `app/api/teacher/expense-claims/resubmit/route.ts`
  - `app/api/tickets/upload/[token]/route.ts`
  - `app/api/tickets/files/[filename]/route.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-storage-helper-and-ux-followups.md`
- Risk impact (if any): Medium-low. This ship touches multiple file-open/upload paths, but keeps the same routes, DB fields, approval rules, ticket flows, and expense-claim business logic; live attachment smoke checks were completed before release closeout.
- Verification:
  - `npm run build` passed
  - `npm run audit:upload-integrity` was run locally; high missing counts were confirmed as local-environment file-disk mismatch, not a regression in the new helper
  - helper smoke check passed for `expense_claim / payment_proof / partner_payment_proof / shared_docs_local / tickets` store-read-delete cycle
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirmed `local / origin / server` aligned on the release branch and `https://sgtmanage.com/admin/login` returned `200`
  - logged-in live QA confirmed:
    - `/api/expense-claims/[id]/receipt` returns `200`
    - `/api/admin/parent-payment-records/[id]/file` returns `200`
    - `/uploads/partner-payment-proofs/*` sample links return `200`
    - `/api/shared-docs/[id]/file` triggers the expected file download flow
    - `/api/tickets/files/[filename]` returns `200`
  - targeted UI checks confirmed:
    - admin expense claims and receipt approvals expose attachment-issue triage more clearly
    - admin students page can recover from empty `today` queues and remembers the last queue when no explicit `view` is set
    - teacher session detail now guides teachers to attendance first, feedback second without changing submission rules
- Rollback point: previous production commit before `2026-04-02-r04`.

## 2026-04-02-r03

- Release ID: `2026-04-02-r03`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Turn the admin workspace into a lighter task-first workbench across navigation, homepage, todo center, students, approvals, packages, and feedback flows.
- Key files:
  - `app/admin/AdminSidebarNavClient.tsx`
  - `app/admin/_components/workbenchStyles.ts`
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `app/admin/todos/page.tsx`
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `app/admin/students/[id]/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/packages/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-admin-workbench-ux-rollout.md`
- Risk impact (if any): Medium-low. This ship changes admin navigation and high-frequency page presentation across many screens, but does not change routes, permissions, approval order, or underlying business logic.
- Verification:
  - `npm run build` passed
  - admin sidebar now groups work by task area instead of one long always-open menu
  - admin homepage now opens as a task-first workbench instead of a setup-first landing page
  - todo center, students, receipts, expense claims, packages, and feedback pages now lead with current context and next actions before long forms/tables
- Rollback point: previous production commit before `2026-04-02-r03`.

## 2026-03-31-r3

- Release ID: `2026-03-31-r3`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Scope: Extend teacher session visibility window and normalize availability date handling to business timezone across teacher/admin views.
- Key files:
  - `app/teacher/sessions/page.tsx`
  - `app/teacher/availability/page.tsx`
  - `app/api/teacher/availability/_lib.ts`
  - `app/api/teacher/availability/slots/route.ts`
  - `app/api/teacher/availability/clear-day/route.ts`
  - `app/api/admin/teachers/[id]/availability/route.ts`
  - `app/api/admin/teachers/[id]/availability/date/route.ts`
  - `app/api/admin/teachers/[id]/availability/generate-month/route.ts`
  - `app/admin/teachers/[id]/calendar/page.tsx`
- Risk impact (if any): Low-to-medium. Changes how date-only availability rows are queried/rendered, but does not change scheduling rules or slot durations.
- Verification:
  - `npm run build` passed.
  - production probe confirmed Yunfeng still has `46` April sessions and `57` April date-availability rows; the issue was display logic, not missing data.
- Rollback point: Previous production commit before `2026-03-31-r3`.

## 2026-03-22-r1

- Release ID: `2026-03-22-r1`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Time display unification (business timezone format), finance/receipt flow continuity, layout and route stability checks.
- Key files:
  - `lib/date-only.ts`
  - `app/admin/layout.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/finance/workbench/page.tsx`
  - `app/admin/finance/student-package-invoices/page.tsx`
- Risk impact (if any): Finance role route/menu is intentionally restricted by role policy; non-finance admin menu differs by design.
- Verification:
  - `npm run build` passed.
  - `https://sgtmanage.com/admin/login` returns `200`.
  - PM2 process `tuition-scheduler` online.
- Rollback point: Remote git commit baseline before patch rollout (`56a91b1`) or previous deployment archive.

## 2026-03-22-r2

- Release ID: `2026-03-22-r2`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Add release doc gate in deploy flow (process-only safeguard).
- Key files:
  - `ops/server/scripts/verify_release_docs.sh`
  - `ops/server/scripts/deploy_app.sh`
  - `.github/workflows/deploy-server.yml`
  - `ops/server/.deploy.env.example`
- Risk impact (if any): Deploy can be blocked if release docs are not updated in the deploy commit.
- Verification:
  - `bash -n ops/server/scripts/verify_release_docs.sh`
  - `bash -n ops/server/scripts/deploy_app.sh`
- Rollback point: Revert r2 process files if emergency rollback is needed.

## 2026-03-22-r3

- Release ID: `2026-03-22-r3`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Add server handoff baseline + one-command server operations for new chat windows.
- Key files:
  - `docs/SERVER-HANDOFF.md`
  - `ops/server/server-handoff.env.example`
  - `ops/server/scripts/quick_check.sh`
  - `ops/server/scripts/quick_deploy.sh`
  - `docs/NEW-CHAT-COMMANDS.md`
  - `docs/CODEX-新对话开场白.txt`
- Risk impact (if any): Process-only change; no runtime/business logic impact.
- Verification:
  - `bash -n ops/server/scripts/quick_check.sh`
  - `bash -n ops/server/scripts/quick_deploy.sh`
  - script files are executable
- Rollback point: Revert r3 process files only.

## 2026-03-22-r4

- Release ID: `2026-03-22-r4`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: High-risk ops hardening (docs + dangerous script confirmation gate).
- Key files:
  - `docs/HIGH-RISK-AREAS.md`
  - `docs/运维手册.md`
  - `docs/GitHub-Actions部署说明.md`
  - `docs/CODEX-生产发布指挥模板.md`
  - `docs/自有服务器部署指南.md`
  - `docs/SERVER-HANDOFF.md`
  - `ops/server/scripts/sync_local_db_to_neon.sh`
- Risk impact (if any): Process/script guard only; no business logic change.
- Verification:
  - `bash -n ops/server/scripts/sync_local_db_to_neon.sh`
  - docs now explicitly warn against localhost DB and stale-branch deploy risks.
- Rollback point: Revert r4 doc/script guard files.

## 2026-03-22-r5

- Release ID: `2026-03-22-r5`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Build hotfix to restore missing date helper exports required by finance pages.
- Key files:
  - `lib/date-only.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260322-context-control.md`
- Risk impact (if any): Low; utility exports only, no business rule change.
- Verification:
  - remote build passes after export fix
  - `/admin/login` health check returns `200`
- Rollback point: Previous commit `7598093`.

## 2026-03-22-r6

- Release ID: `2026-03-22-r6`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Fix quick deploy/check script default path resolution.
- Key files:
  - `ops/server/scripts/quick_check.sh`
  - `ops/server/scripts/quick_deploy.sh`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260322-context-control.md`
- Risk impact (if any): Process-only; no runtime business logic change.
- Verification:
  - `bash ops/server/scripts/quick_deploy.sh ...` can find and execute `quick_check.sh`
- Rollback point: `39e9967`.

## 2026-03-22-r7

- Release ID: `2026-03-22-r7`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Release board state alignment after latest successful deploy.
- Key files:
  - `docs/RELEASE-BOARD.md`
  - `docs/CHANGELOG-LIVE.md`
- Risk impact (if any): None (documentation-only alignment).
- Verification:
  - `RELEASE-BOARD` remote commit updated to `d00be8e`
- Rollback point: `d00be8e` (runtime unchanged).

## 2026-03-22-r8

- Release ID: `2026-03-22-r8`
- Date/Time (Asia/Shanghai): `2026-03-22`
- Scope: Add one-click new chat startup verification script and entry docs.
- Key files:
  - `ops/server/scripts/new_chat_startup_check.sh`
  - `docs/SERVER-HANDOFF.md`
  - `docs/NEW-CHAT-COMMANDS.md`
  - `docs/tasks/TASK-20260322-startup-check-rollout.md`
- Risk impact (if any): Process-only; no business logic/runtime behavior change.
- Verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - local/origin/server commit alignment is printed
  - `/admin/login` returns `200`
- Rollback point: `e215176`.

## 2026-03-23-r1

- Release ID: `2026-03-23-r1`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Upload access recovery + recovery scanner key compatibility.
- Key files:
  - `app/admin/recovery/uploads/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-upload-access-recovery.md`
- Risk impact (if any): Low. No billing/approval business rule change; recovery page now scans both legacy/new billing keys.
- Verification:
  - restart `pm2` process `tuition-scheduler` on server
  - `https://sgtmanage.com/uploads/payment-proofs/3e124342-fb43-415a-b15e-810f5ff23c68/1774269713216_6b67ed17.jpg` returns `200`
  - sample upload URLs under `/uploads/tickets/*` return `200`
  - `npm run build` passed
- Rollback point: commit before `2026-03-23-r1` deploy (`072686a`).

## 2026-03-23-r2

- Release ID: `2026-03-23-r2`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Ledger integrity detail report clarity upgrade (reason + evidence + action columns in CSV).
- Key files:
  - `scripts/reconciliation/daily-ledger-integrity.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-ledger-report-clarity.md`
- Risk impact (if any): Low; reporting/output schema enhancement only, no deduction business logic changes.
- Verification:
  - `npm run audit:ledger-integrity`
  - generated detail CSV includes columns `reasonCode/rootCauseCN/rootCauseEN/suggestedActionCN/suggestedActionEN`
- Rollback point: previous deploy commit `7ab2e5f`.

## 2026-03-23-r3

- Release ID: `2026-03-23-r3`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Package ledger note readability upgrade for both legacy/manual reconcile notes and abnormal txn notes.
- Key files:
  - `lib/package-ledger-note.ts`
  - `app/admin/packages/[id]/ledger/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-ledger-note-readable.md`
- Risk impact (if any): Low. Display/wording enhancement only; no minutes delta, posting rule, or deduction logic change.
- Verification:
  - `npm run build` passed
  - ledger page shows readable multi-line notes instead of raw `reason=...;actual=...;expected=...;diff=...` for legacy manual reconcile entries
- Rollback point: previous deploy commit `8a29fc9`.

## 2026-03-23-r4

- Release ID: `2026-03-23-r4`
- Date/Time (Asia/Shanghai): `2026-03-23`
- Scope: Add user-facing helper hint in package ledger edit area to explain readable note behavior after save.
- Key files:
  - `app/admin/packages/[id]/ledger/PackageLedgerEditTxnClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260323-ledger-note-readable.md`
- Risk impact (if any): Very low. UI helper text only; no API/data/ledger arithmetic change.
- Verification:
  - `npm run build` passed
  - edit area shows hint: "保存后将自动按可读模板展示备注（历史技术备注也会自动转为易读说明）"
- Rollback point: previous deploy commit `be377a2`.

## 2026-03-26-r1

- Release ID: `2026-03-26-r1`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Deployment status: `LIVE` (included in the currently deployed production branch lineage)
- Scope: Align group package selection across enrollment preview, enrollment submit, attendance package ordering, and student package balance preview; prefer `GROUP_MINUTES` and keep `GROUP_COUNT` fallback for legacy group classes.
- Key files:
  - `lib/package-mode.ts`
  - `app/api/admin/classes/[id]/enrollment-preview/route.ts`
  - `app/api/admin/enrollments/route.ts`
  - `app/api/admin/students/[id]/package-balance-preview/route.ts`
  - `app/admin/sessions/[id]/attendance/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260326-group-package-alignment.md`
- Risk impact (if any): Medium-low. Affects group-class package matching/preview behavior only; 1-on-1 package logic remains unchanged. Main risk is inconsistent legacy `GROUP_COUNT` expectations if downstream pages assume minute-based checks.
- Verification:
  - `npm run build` passed
  - group-class enrollment preview and submit use the same preferred package rule
  - attendance page package ordering prefers `GROUP_MINUTES`, then falls back to legacy `GROUP_COUNT`
  - package balance preview no longer treats legacy `GROUP_COUNT` as minute-based duration check
- Rollback point: previous commit before alignment patch (`6536928` baseline before next deploy commit).

## 2026-03-26-r3

- Release ID: `2026-03-26-r3`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Scope: Backend integrity hardening for scheduling, package top-up, expense claim state transitions, and teacher availability cleanup/guard rails.
- Key files:
  - `app/api/admin/students/[id]/quick-appointment/route.ts`
  - `app/api/admin/ops/execute/route.ts`
  - `app/api/admin/classes/[id]/sessions/generate-weekly/route.ts`
  - `app/api/admin/teachers/[id]/generate-sessions/route.ts`
  - `app/api/admin/packages/[id]/top-up/route.ts`
  - `app/api/admin/teachers/[id]/availability/date/route.ts`
  - `app/api/admin/teachers/[id]/availability/weekly/route.ts`
  - `app/api/teacher/availability/slots/route.ts`
  - `app/api/teacher/availability/bulk/route.ts`
  - `app/api/teacher/availability/undo/route.ts`
  - `lib/expense-claims.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/20260326183000_add_session_unique_schedule_guard/migration.sql`
  - `prisma/migrations/20260326195000_add_availability_unique_guards/migration.sql`
  - `scripts/report-availability-integrity.ts`
  - `scripts/clean-availability-integrity.ts`
  - `docs/tasks/TASK-20260326-backend-integrity-hardening.md`
- Risk impact (if any): Medium. Duplicate writes are now blocked at DB/app layers, availability creation now rejects overlaps, and historical availability data was normalized by merging overlapping ranges. Normal scheduling rules are unchanged, but repeated submits now fail fast instead of silently duplicating.
- Verification:
  - `npm run test:backend` passed (`16/16`)
  - `npm run build` passed
  - `npm run audit:availability-integrity` reports zero duplicate/overlap groups
  - `npx prisma migrate deploy` applied `20260326183000_add_session_unique_schedule_guard` and `20260326195000_add_availability_unique_guards`
  - post-deploy `bash ops/server/scripts/new_chat_startup_check.sh` confirms local/origin/server align on the live branch head
  - release-doc closeout follow-up was completed on the same live branch lineage
- Rollback point: previous production commit before backend-integrity deploy (`98f1b9d` lineage baseline).

## 2026-03-26-r2

- Release ID: `2026-03-26-r2`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Deployment status: `LIVE` (included in the currently deployed production branch lineage)
- Scope: Fix todo-center deduction status so waived assessment attendance is not shown as pending deduction.
- Key files:
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260326-waived-attendance-todo-fix.md`
- Risk impact (if any): Low. Todo/dashboard display logic only; no attendance write path or package ledger arithmetic change.
- Verification:
  - `npm run build` passed
  - attendance rows with `waiveDeduction=true` are excluded from todo pending-deduction count
  - waived assessment lessons show "无需减扣" instead of "待减扣"
- Rollback point: previous commit before todo waived-deduction fix (`dcac9fe`).

## 2026-03-26-doc-status

- Release ID: `2026-03-26-doc-status`
- Date/Time (Asia/Shanghai): `2026-03-26`
- Deployment status: `LIVE`
- Scope: Align release documents with the actual server commit and current deploy state after startup-check verification.
- Key files:
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260326-live-status-alignment.md`
- Risk impact (if any): None. Documentation/process alignment only; no business logic or runtime behavior change.
- Verification:
  - `bash ops/server/scripts/new_chat_startup_check.sh`
  - local/origin/server are aligned
  - `2026-03-26-r1/r2` are now marked live after deploy completion
- Rollback point: previous docs-only release alignment commit.

## 2026-03-27-r1

- Release ID: `2026-03-27-r1`
- Date/Time (Asia/Shanghai): `2026-03-27`
- Deployment status: `LIVE` (included in the currently deployed production branch lineage)
- Scope: Add optimistic-lock retry protection for `partner/parent billing` JSON stores and related approval flows, plus regression coverage for concurrent-write preservation.
- Key files:
  - `lib/app-setting-lock.ts`
  - `lib/partner-billing.ts`
  - `lib/student-parent-billing.ts`
  - `lib/partner-settlement-approval.ts`
  - `lib/partner-receipt-approval.ts`
  - `lib/parent-receipt-approval.ts`
  - `tests/app-setting-lock.test.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/tasks/TASK-20260327-billing-optimistic-lock.md`
- Risk impact (if any): Medium. Existing data model and UI flow stay unchanged, but concurrent billing/approval writes now retry against latest `AppSetting.updatedAt` and may fail explicitly instead of silently overwriting another operator's changes.
- Verification:
  - `npm run test:backend` passed (`22/22`)
  - `npm run build` passed
  - parent invoice creation test preserves a concurrent invoice after retry
  - partner settlement reject test replays correctly after optimistic-lock conflict
- Rollback point: previous production commit before `2026-03-27-r1` deploy (`c3800f0`).

## 2026-03-29-r1

- Release ID: `2026-03-29-r1`
- Date/Time (Asia/Shanghai): `2026-03-29`
- Deployment status: `LIVE`
- Scope: Fix receipt/settlement approval state loading after the `AppSetting` optimistic-lock rollout so existing JSON approval rows are read correctly instead of being treated as empty.
- Key files:
  - `lib/parent-receipt-approval.ts`
  - `lib/partner-receipt-approval.ts`
  - `lib/partner-settlement-approval.ts`
  - `tests/billing-optimistic-lock.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260329-receipt-approval-json-read-fix.md`
- Risk impact (if any): Medium. No approval rules or routes changed, but approval JSON rows now hydrate from stored arrays correctly, which restores manager/finance status visibility and prevents approval flows from acting like prior approvals are missing.
- Verification:
  - `npm run test:backend` passed (`23/23`)
  - `npm run build` passed
  - parent receipt approval map regression test confirms stored JSON approvals are read back with normalized approver emails
- Rollback point: previous production commit before `2026-03-29-r1` hotfix (`2ce03bd`).

## 2026-03-29-r2

- Release ID: `2026-03-29-r2`
- Date/Time (Asia/Shanghai): `2026-03-29`
- Deployment status: `LIVE`
- Scope: Add a guardrail around the `AppSetting` optimistic-lock helper so callers treat `sanitize` input as already-parsed JSON, plus regression coverage for that contract.
- Key files:
  - `lib/app-setting-lock.ts`
  - `tests/app-setting-lock.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260329-app-setting-sanitize-guard.md`
- Risk impact (if any): Low. Runtime business logic is unchanged; this only documents the helper contract and adds a test to catch future regressions in JSON-store callers.
- Verification:
  - `npm run test:backend` passed (`24/24`)
- Rollback point: previous production commit before `2026-03-29-r2` (`06c6fc7`).

## 2026-03-30-r1

- Release ID: `2026-03-30-r1`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE`
- Scope: Prevent duplicate expense-claim submissions from repeated taps and clean up the duplicated Ahmar transport claims created on `2026-03-30`.
- Key files:
  - `lib/expense-claims.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/_components/ExpenseClaimForm.tsx`
  - `app/_components/ExpenseClaimSubmitButton.tsx`
  - `tests/expense-claims.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-claim-duplicate-guard.md`
- Risk impact (if any): Medium. Normal expense submission flow is unchanged, but exact duplicate claims within a short window now resolve to "already submitted" instead of writing more rows.
- Verification:
  - `npm run test:backend` passed (`25/25`)
  - `npm run build` passed
  - Ahmar duplicate `2026-03-29` transport claims were reduced to a single retained submission
- Rollback point: previous production commit before `2026-03-30-r1` (`157ea31`).

## 2026-03-30-r2

- Release ID: `2026-03-30-r2`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE`
- Scope: Route admin parent payment proof open/preview through a controlled record-id endpoint in receipt approvals.
- Key files:
  - `app/api/admin/parent-payment-records/[id]/file/route.ts`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-parent-payment-proof-route.md`
- Risk impact (if any): Low. No parent billing storage, upload, receipt creation, or approval rules changed; only the admin file open/preview path for parent payment proof records now resolves via a controlled route.
- Verification:
  - `npm run build` passed
  - admin receipt approvals now opens parent payment proof files via `/api/admin/parent-payment-records/[id]/file`
  - existing valid payment-proof files remain reachable through the controlled route
- Rollback point: previous production commit before `2026-03-30-r2`.

## 2026-03-30-r3

- Release ID: `2026-03-30-r3`
- Date/Time (Asia/Shanghai): `2026-03-30 15:44 CST`
- Deployment status: `LIVE` after deploy completion
- Scope: Allow teachers to correct rejected expense claims and resubmit the same claim back into the approval queue.
- Key files:
  - `lib/expense-claims.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `tests/expense-claims.test.ts`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-claim-resubmit.md`
- Risk impact (if any): Low-to-medium. Only rejected claims gain a resubmit path; approval, payment, and archive rules stay unchanged. Teachers can now reopen a rejected claim by correcting fields and optionally replacing the attachment.
- Verification:
  - `npm run test:backend` passed (`27/27`)
  - `npm run build` passed
  - rejected claims return to `SUBMITTED` after resubmit
  - non-rejected claims are blocked from using the resubmit path
- Rollback point: previous production commit before `2026-03-30-r3`.
- Release closeout: production branch/doc alignment confirmed on follow-up docs commit `f28a145`.

## 2026-03-30-r4

- Release ID: `2026-03-30-r4`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Improve teacher expense-claim receipt/status UX with bilingual human-readable labels and explicit attachment-health feedback.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-claim-ux-copy.md`
- Risk impact (if any): Low. Teacher-facing wording and attachment-health indicators only; approval, payment, and archive logic are unchanged.
- Verification:
  - `npm run build` passed
  - expense-claim statuses render as bilingual human-readable labels
  - missing attachments show explicit bilingual warning text
  - rejected claims show a clearer bilingual next-step card for resubmission
- Rollback point: previous production commit before `2026-03-30-r4`.

## 2026-03-30-r5

- Release ID: `2026-03-30-r5`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce clutter on the admin receipt approval page with clearer queue wording, stronger focus on the selected receipt, and secondary tools moved into `More actions / 更多操作`.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-ux-polish.md`
- Risk impact (if any): Low. Review/approval business rules, permissions, and finance workflows are unchanged; this release only changes interaction emphasis and bilingual copy on the receipt approval page.
- Verification:
  - `npm run build` passed
  - queue rows show bilingual human-readable status labels
  - selected receipt panel highlights the current item and main review action
  - fix/revoke/package-billing links moved under `More actions / 更多操作`
- Rollback point: previous production commit before `2026-03-30-r5`.

## 2026-03-30-r6

- Release ID: `2026-03-30-r6`
- Date/Time (Asia/Shanghai): `2026-03-30 16:23 CST`
- Deployment status: `LIVE` after deploy completion
- Scope: Smooth receipt approval handling with next-item auto-advance, standardized bilingual reject reasons, and a lightweight timeline for the selected receipt.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-flow-smoothing.md`
- Risk impact (if any): Low. Approval sequencing, permission rules, and receipt/billing data flow remain unchanged; this release only improves interaction flow and bilingual guidance on the receipt approval page.
- Verification:
  - `npm run build` passed
  - approve/reject actions carry forward to the next queue item
  - reject actions use standardized bilingual reasons plus optional detail
  - selected receipt panel shows a lightweight bilingual timeline
- Rollback point: previous production commit before `2026-03-30-r6`.

## 2026-03-30-r7

- Release ID: `2026-03-30-r7`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the receipt approval queue feel more like a worklist with task-first ordering, clearer success feedback, and action-oriented risk guidance.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-worklist-polish.md`
- Risk impact (if any): Low. This release only adjusts queue ordering and bilingual review-page messaging; approval sequence, permissions, and billing data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - pending risky items sort ahead of completed items in the review queue
  - success banner explains the action result and next-item jump in bilingual wording
  - risk box includes explicit bilingual recommended next steps
- Rollback point: previous production commit before `2026-03-30-r7`.

## 2026-03-30-r8

- Release ID: `2026-03-30-r8`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Further reduce receipt approval cognitive load by de-emphasizing completed rows, adding queue risk badges, and clarifying current role focus.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-role-focus-polish.md`
- Risk impact (if any): Low. This release only adjusts review-page presentation and queue labeling; approval order, permissions, and billing data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - completed rows render with lower visual priority in the queue
  - queue rows show bilingual risk badges such as missing proof / file missing / ready
  - selected receipt panel shows current role focus in bilingual wording
- Rollback point: previous production commit before `2026-03-30-r8`.

## 2026-03-30-r9

- Release ID: `2026-03-30-r9`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Reshape the receipt approval queue into clearer work buckets: my next actions, other open items, and completed history.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-bucketed-queue.md`
- Risk impact (if any): Low. This release only changes review-page grouping and emphasis; approval order, permissions, and finance data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - queue renders separate bilingual sections for my next actions, other open items, and completed history
  - completed items no longer visually compete with open work
  - selected receipt behavior and review actions remain unchanged
- Rollback point: previous production commit before `2026-03-30-r9`.

## 2026-03-30-r10

- Release ID: `2026-03-30-r10`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Add queue bucket summaries, one-click focus filters, and a collapsed completed-history section on the receipt approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-focus-filters.md`
- Risk impact (if any): Low. This release only changes queue focus controls and history visibility; approval order, permissions, and finance data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - queue header shows bilingual counts for my actions, other open items, and completed history
  - operators can switch to focused views such as only my actions or only completed history
  - completed history is collapsed by default unless the history-only view is selected
- Rollback point: previous production commit before `2026-03-30-r10`.

## 2026-03-30-r11

- Release ID: `2026-03-30-r11`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Add queue-level fix shortcuts for risky parent receipts and tighten queue priority so missing proof/file issues rise above generic review work.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-fix-shortcuts.md`
- Risk impact (if any): Low. This release only changes queue shortcuts and ordering emphasis; approval order, permissions, and finance data flow stay unchanged.
- Verification:
  - `npm run build` passed
  - parent rows with rejected/missing-proof/file-missing states show a bilingual fix shortcut in the queue
  - missing proof and missing file issues sort ahead of generic review items
  - selected receipt actions and approval rules remain unchanged
- Rollback point: previous production commit before `2026-03-30-r11`.

## 2026-03-30-r12

- Release ID: `2026-03-30-r12`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Align receipt approval queue and detail-panel risk signals, remove duplicated bilingual copy, and keep `Only my actions` from auto-selecting unrelated open work when the bucket is empty.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-qa-followups.md`
- Risk impact (if any): Low. This release only fixes approval-page guidance and selection behavior; approval rules, permissions, and finance data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - selected receipt risk panel now matches queue-level file-missing and missing-proof signals
  - duplicated bilingual labels no longer render twice in the queue and detail panel
  - `Only my actions / 只看我待处理的` no longer defaults to another bucket when there are no mine items
- Rollback point: previous production commit before `2026-03-30-r12`.

## 2026-03-30-r13

- Release ID: `2026-03-30-r13`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Remove the remaining duplicated bilingual labels in the selected receipt detail and action area on the receipt approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-copy-cleanup.md`
- Risk impact (if any): Low. This release only cleans up operator-facing bilingual copy in the selected receipt panel; approval rules, permissions, and finance data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - timeline, manager/finance action headers, receipt file card, and more-actions labels render once in bilingual mode
  - revoke input/button labels no longer duplicate the same bilingual copy twice
- Rollback point: previous production commit before `2026-03-30-r13`.

## 2026-03-30-r14

- Release ID: `2026-03-30-r14`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Add clearer batch-style review actions, stronger risk tiers, and a fix-flow return cue on the receipt approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-receipt-approval-batch-flow-and-risk-tiers.md`
- Risk impact (if any): Low. This release only refines operator guidance and action wording on the approval page; approval rules, permissions, and finance data flow remain unchanged.
- Verification:
  - `npm run build` passed
  - primary review buttons now read `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条` when another queue item is available
  - queue rows now distinguish `Blocker / 阻塞`, `Needs check / 需要核对`, and `Ready / 可处理`
  - finance fix flows show a bilingual return cue back to the selected receipt review item
- Rollback point: previous production commit before `2026-03-30-r14`.

## 2026-03-30-r15

- Release ID: `2026-03-30-r15`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Hotfix the teacher expense-claim submit button so browser-side validation no longer leaves the UI stuck on `Submitting...`.
- Key files:
  - `app/_components/ExpenseClaimSubmitButton.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-submit-validation-hotfix.md`
- Risk impact (if any): Low. This release only changes client-side pending behavior for expense-claim submission buttons; expense validation rules, submit flow, and duplicate protection remain unchanged.
- Verification:
  - `npm run build` passed
  - expense-claim submit button only switches to `Submitting... / 提交中...` after browser validity checks pass
  - missing required fields or files no longer leave the button stuck in a disabled pending state
- Rollback point: previous production commit before `2026-03-30-r15`.

## 2026-03-30-r16

- Release ID: `2026-03-30-r16`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify teacher expense-claim form requirements with bilingual pre-submit guidance and field-level hints.
- Key files:
  - `app/_components/ExpenseClaimForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-form-guidance.md`
- Risk impact (if any): Low. This release only improves form copy and hint text; expense validation rules, submit flow, and approval logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher expense form now shows a bilingual `Before you submit / 提交前请检查` checklist
  - transport, attachment, and purpose fields now include clearer bilingual helper text
- Rollback point: previous production commit before `2026-03-30-r16`.

## 2026-03-30-r17

- Release ID: `2026-03-30-r17`
- Date/Time (Asia/Shanghai): `2026-03-30`
- Deployment status: `LIVE` after deploy completion
- Scope: Move expense-claim submit and resubmit flows off volatile Next Server Actions onto stable multipart POST routes for teacher and admin entry points.
- Key files:
  - `app/api/teacher/expense-claims/route.ts`
  - `app/api/teacher/expense-claims/resubmit/route.ts`
  - `app/api/admin/expense-claims/route.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/_components/ExpenseClaimForm.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260330-expense-submit-route-stability.md`
- Risk impact (if any): Medium-low. This release keeps the same validation, duplicate guard, and approval behavior, but switches submit transport for teacher/admin expense forms to stable route handlers so already-open pages are less likely to fail across deploys.
- Verification:
  - `npm run build` passed
  - teacher new submit now posts to `/api/teacher/expense-claims`
  - teacher rejected-claim resubmit now posts to `/api/teacher/expense-claims/resubmit`
  - admin self-submit now posts to `/api/admin/expense-claims`
- Rollback point: previous production commit before `2026-03-30-r17`.

## 2026-03-31-r01

- Release ID: `2026-03-31-r01`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Fix teacher/admin expense submit buttons so mobile browsers do not get stuck on `Submitting...` before the browser sends the real multipart POST.
- Key files:
  - `app/_components/ExpenseClaimSubmitButton.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-expense-submit-button-timing.md`
- Risk impact (if any): Low. This release only delays the pending-state UI flip by one tick so native form submission can start first; expense validation, duplicate-submit handling, and approval/payment logic stay unchanged.
- Verification:
  - `npm run build` passed
  - reproduced locally that disabling a submit button inside its click handler can prevent the browser from sending the form request
  - expense submit button now enters `Submitting... / 提交中...` after the browser has a chance to dispatch the native submit
- Rollback point: previous production commit before `2026-03-31-r01`.

## 2026-03-31-r02

- Release ID: `2026-03-31-r02`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Let teachers withdraw their own submitted expense claims before review instead of needing hard delete.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260331095000_add_expense_claim_withdrawn_status/migration.sql`
  - `lib/expense-claims.ts`
  - `app/api/teacher/expense-claims/withdraw/route.ts`
  - `app/teacher/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-expense-claim-withdraw.md`
- Risk impact (if any): Medium-low. This adds a new `WITHDRAWN` status and a teacher-only withdraw path for `SUBMITTED` claims; approval, rejection, payment, and archive logic for all existing statuses stay unchanged.
- Verification:
  - `npm run build` passed
  - teachers now see `Withdraw claim / 撤回报销单` on their own submitted claims
  - only `SUBMITTED` claims can be withdrawn
- Rollback point: previous production commit before `2026-03-31-r02`.

## 2026-03-31-r03

- Release ID: `2026-03-31-r03`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Hide withdrawn expense claims from the default teacher list while keeping them available through the status filter.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-expense-claim-default-hide-withdrawn.md`
- Risk impact (if any): Low. This release only changes the default teacher list view for expense claims; withdraw, submit, approval, payment, and archive behavior stay unchanged.
- Verification:
  - `npm run build` passed
  - `All active claims / 全部有效报销单` now excludes `WITHDRAWN` by default
  - teachers can still review withdrawn claims by explicitly selecting `WITHDRAWN`
- Rollback point: previous production commit before `2026-03-31-r03`.

## 2026-03-31-r04

- Release ID: `2026-03-31-r04`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Add uploads backup/audit/disk-monitoring ops toolkit for safer file retention and earlier storage alerts.
- Key files:
  - `scripts/audit-upload-integrity.ts`
  - `ops/server/scripts/run_upload_integrity_with_alert.sh`
  - `ops/server/scripts/setup_upload_integrity_cron.sh`
  - `ops/server/scripts/check-disk-usage.sh`
  - `ops/server/scripts/setup_disk_usage_cron.sh`
  - `ops/server/scripts/report-large-dirs.sh`
  - `ops/server/scripts/backup_uploads_to_object_storage.sh`
  - `ops/server/scripts/setup_uploads_backup_cron.sh`
  - `package.json`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-upload-ops-toolkit.md`
- Risk impact (if any): Low. This release adds server-side audit/backup/monitoring tooling only; no upload business logic, approval flow, or file path format changed.
- Verification:
  - `npm run audit:upload-integrity` passed and wrote reports under `ops/reports/`
  - `bash ops/server/scripts/check-disk-usage.sh` passed
  - `bash ops/server/scripts/report-large-dirs.sh` passed
  - `npm run build` passed
- Rollback point: previous production commit before `2026-03-31-r04`.

## 2026-03-31-r05

- Release ID: `2026-03-31-r05`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Hotfix object-storage upload path for ops backup archives by avoiding multipart upload on the current S3-compatible endpoint.
- Key files:
  - `ops/server/scripts/upload_object_storage_s3.sh`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-upload-object-storage-hotfix.md`
- Risk impact (if any): Low. This release only changes the ops backup upload method for archive files; runtime upload flows, file paths, and business features stay unchanged.
- Verification:
  - `bash -n ops/server/scripts/upload_object_storage_s3.sh` passed
  - upload backup archive can be written to the configured object-storage bucket without the previous multipart `MissingContentLength` error
- Rollback point: previous production commit before `2026-03-31-r05`.

## 2026-03-31-r06

- Release ID: `2026-03-31-r06`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Fix admin student list counters so the `Full List / 完整列表` card shows the true total student count instead of the current filtered view count.
- Key files:
  - `app/admin/students/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-student-full-list-count-fix.md`
- Risk impact (if any): Low. This only corrects display counters and pagination math labels on the admin students page; no student data, filters, or mutation behavior changed.
- Verification:
  - `npm run build` passed
  - production total student count verified as `73`
  - `Full List / 完整列表` now uses the real total instead of the active view count
- Rollback point: previous production commit before `2026-03-31-r06`.

## 2026-03-31-r07

- Release ID: `2026-03-31-r07`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Reorganize the partner settlement page so daily work focuses on pending actions first, while billing history and settlement setup are moved into lower-priority collapsed sections.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-ux-reorder.md`
- Risk impact (if any): Low. This only changes layout, section ordering, and action-oriented bilingual copy on the partner settlement page; settlement logic, permissions, rates, and billing actions stay unchanged.
- Verification:
  - `npm run build` passed
  - pending work queue now appears before history and setup sections
  - rate settings and package mode config are collapsed into `Settlement setup / 结算配置`
- Rollback point: previous production commit before `2026-03-31-r07`.

## 2026-03-31-r08

- Release ID: `2026-03-31-r08`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a selected-item focus panel, integrity workbench entry points, and billing-history filters to the partner settlement page.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-focus-panel.md`
- Risk impact (if any): Low. This only changes page navigation, focus helpers, and history filtering on the partner settlement page; settlement calculations, invoice creation, permissions, and data mutations remain unchanged.
- Verification:
  - `npm run build` passed
  - partner settlement page shows a sticky `Selected item / 当前处理项` card
  - queue tables provide `Focus / 聚焦` actions
  - billing history supports `All history / 全部历史`, `Invoice only / 仅已开票`, and `Receipt created / 仅已开收据`
- Rollback point: previous production commit before `2026-03-31-r08`.

## 2026-03-31-r09

- Release ID: `2026-03-31-r09`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the partner settlement focus panel more action-oriented and add warning-type summary cards inside the integrity workbench.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-action-focus.md`
- Risk impact (if any): Low. This only adjusts UI copy and warning summaries on the partner settlement page; no settlement rules, calculations, permissions, or actions changed.
- Verification:
  - `npm run build` passed
  - selected-item primary actions now read like direct next steps
  - integrity workbench shows grouped counts for missing-feedback and status-excluded warning rows
- Rollback point: previous production commit before `2026-03-31-r09`.

## 2026-03-31-r10

- Release ID: `2026-03-31-r10`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the partner settlement focus panel actionable and add direct warning-type review shortcuts in the integrity workbench.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-direct-actions.md`
- Risk impact (if any): Low. This only changes partner settlement page interaction flow and shortcut links; settlement calculations, permissions, settlement creation rules, invoice behavior, and revert behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - selected-item panel can directly submit online/offline settlement creation when the user is allowed to act
  - integrity workbench summary cards can jump straight to the first matching warning row
- Rollback point: previous production commit before `2026-03-31-r10`.

## 2026-03-31-r11

- Release ID: `2026-03-31-r11`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Make `Open history / 打开历史` on the partner settlement overview actually expand the billing history section.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-history-open.md`
- Risk impact (if any): Low. This only adjusts a history-panel open state on the partner settlement page; settlement logic, queues, permissions, and calculations remain unchanged.
- Verification:
  - `npm run build` passed
  - clicking `Open history / 打开历史` now lands on an expanded billing-history section
- Rollback point: previous production commit before `2026-03-31-r11`.

## 2026-03-31-r12

- Release ID: `2026-03-31-r12`
- Date/Time (Asia/Shanghai): `2026-03-31`
- Deployment status: `LIVE` after deploy completion
- Scope: Fix the partner settlement integrity-workbench Todo Center shortcut so it points to the real admin todo route.
- Key files:
  - `app/admin/reports/partner-settlement/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260331-partner-settlement-todo-link-fix.md`
- Risk impact (if any): Low. This only fixes a broken navigation link from the integrity workbench; settlement logic, warnings, billing flows, and permissions remain unchanged.
- Verification:
  - `npm run build` passed
  - `Open todo center / 打开待办中心` now targets `/admin/todos`
- Rollback point: previous production commit before `2026-03-31-r12`.

## 2026-04-01-r01

- Release ID: `2026-04-01-r01`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Rework the admin expense-claim approval page into a focused review queue with a selected-claim panel and next-step review actions.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-review-flow.md`
- Risk impact (if any): Low. This changes review-page layout and action wording on the admin expense-claim page only; approval, rejection, payment, archive, and export rules remain unchanged.
- Verification:
  - `npm run build` passed
  - submitted claims now appear in a dedicated review queue
  - the selected-claim panel supports `Approve & next / 批准并下一条` and `Reject & next / 驳回并下一条`
  - the full claim list remains available in a collapsed history/details section
- Rollback point: previous production commit before `2026-04-01-r01`.

## 2026-04-01-r02

- Release ID: `2026-04-01-r02`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce admin expense-claim review-page noise by demoting reminders and self-submit tools, and stop the collapsed history list from preloading missing receipt thumbnails.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-review-noise-reduction.md`
- Risk impact (if any): Low. This only changes admin expense-claim page presentation and image-loading behavior in the collapsed history list; approval, rejection, payment, and archive logic remain unchanged.
- Verification:
  - `npm run build` passed
  - follow-up reminders now appear in a collapsed summary block below the main review queue
  - the self-submit form moved to a lower-priority collapsed section
  - the collapsed history list no longer preloads receipt thumbnails that could spam 404 console errors
- Rollback point: previous production commit before `2026-04-01-r02`.

## 2026-04-01-r03

- Release ID: `2026-04-01-r03`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a finance-focused payout queue and selected-payout workflow to the admin expense-claim page.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-finance-flow.md`
- Risk impact (if any): Low. This only reorganizes the admin expense-claim payment workflow and button flow for finance users; approval, rejection, payment persistence, archive behavior, and export rules remain unchanged.
- Verification:
  - `npm run build` passed
  - approved unpaid claims now appear in a dedicated finance queue
  - the selected payout panel keeps payment method, payment reference, batch month, and remarks together
  - finance users can use `Mark paid & next / 标记已付款并下一条` to move through the queue
- Rollback point: previous production commit before `2026-04-01-r03`.

## 2026-04-01-r04

- Release ID: `2026-04-01-r04`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a grouped batch-payout flow for finance on the admin expense-claim page.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-finance-batch-payout.md`
- Risk impact (if any): Low. This changes finance-side page workflow only; the system still records payment claim-by-claim using the existing payment logic, audit trail, and archive rules.
- Verification:
  - `npm run build` passed
  - approved unpaid claims now group by submitter and currency
  - finance can select multiple claims in one group and submit shared payment details once
  - the page still preserves the existing single-claim payment behavior in the full history section
- Rollback point: previous production commit before `2026-04-01-r04`.

## 2026-04-01-r05

- Release ID: `2026-04-01-r05`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify quick filters versus advanced filters on the admin expense-claim page.
- Key files:
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-expense-claim-filter-clarity.md`
- Risk impact (if any): Low. This only changes filter presentation and explanatory copy on the admin expense-claim page; claim review, finance batch payout, export behavior, and archive rules remain unchanged.
- Verification:
  - `npm run build` passed
  - quick work filters now sit above the main queues and clearly state they affect the queues, history list, and CSV export together
  - advanced filters now live in a dedicated details block with matching explanatory copy
- Rollback point: previous production commit before `2026-04-01-r05`.

## 2026-04-01-r06

- Release ID: `2026-04-01-r06`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the receipt-approval finance queue easier to use on normal-width screens by converting the unified queue from a wide table into a compact worklist.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-receipt-approval-finance-queue-narrowing.md`
- Risk impact (if any): Low. This changes receipt-approval queue presentation only; finance approval, manager approval, reject reasons, redo flow, and receipt creation rules remain unchanged.
- Verification:
  - `npm run build` passed
  - unified receipt queue now renders as compact cards instead of a 9-column table
  - the queue keeps only receipt number, party, amount, status, and risk at list level
  - normal-width screens no longer require horizontal scrolling to understand the finance queue
- Rollback point: previous production commit before `2026-04-01-r06`.

## 2026-04-01-r07

- Release ID: `2026-04-01-r07`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify package-level finance mode versus the global receipt queue on the receipt-approval page.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-receipt-approval-package-mode-clarity.md`
- Risk impact (if any): Low. This only changes page context and presentation while working inside one package; receipt approval, reject, redo, receipt creation, and payment-record rules remain unchanged.
- Verification:
  - `npm run build` passed
  - selecting a package now shows a dedicated package-workspace context card with clear back-to-queue actions
  - the package finance workspace stays open by default once a package is selected
  - the global receipt queue is still available but is visually downgraded to a secondary section while package mode is active
- Rollback point: previous production commit before `2026-04-01-r07`.

## 2026-04-01-r08

- Release ID: `2026-04-01-r08`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Rework the admin sign-in alert page into a session-card workbench so teaching staff can scan the warning board without misreading mixed rows.
- Key files:
  - `app/admin/alerts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-admin-signin-alert-workbench.md`
- Risk impact (if any): Low. This changes admin alert presentation only; alert sync, thresholds, attendance logic, feedback logic, and session actions remain unchanged.
- Verification:
  - `npm run build` passed
  - the admin page now groups alert rows by session card instead of showing one wide mixed table
  - quick-focus filters separate urgent, attendance-only, and feedback-only queues
  - feedback overdue timing is now displayed from the actual post-class feedback due time instead of the sign-in threshold time
- Rollback point: previous production commit before `2026-04-01-r08`.

## 2026-04-01-r09

- Release ID: `2026-04-01-r09`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the sign-in alert summary follow the current quick-focus filter.
- Key files:
  - `app/admin/alerts/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-admin-signin-alert-focus-summary.md`
- Risk impact (if any): Low. This only changes the alert summary counts shown at the top of the page; sync rules, thresholds, card layout, and action links remain unchanged.
- Verification:
  - `npm run build` passed
  - when switching to `Urgent first`, `Attendance only`, or `Feedback only`, the top summary now matches the filtered queue instead of keeping the full-page totals
- Rollback point: previous production commit before `2026-04-01-r09`.

## 2026-04-01-r10

- Release ID: `2026-04-01-r10`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce confusion in the admin package-create flow by turning the large modal into a guided step-by-step form with a live summary card.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-flow-clarity.md`
- Risk impact (if any): Low. This changes package-create presentation only; package validation, package creation API behavior, settlement mode rules, and package ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - package creation now guides staff through four steps instead of one long form
  - a live summary card keeps student, course, balance, validity, payment, and settlement mode visible while filling the form
  - advanced sharing and note fields are moved into a secondary advanced section
- Rollback point: previous production commit before `2026-04-01-r10`.

## 2026-04-01-r11

- Release ID: `2026-04-01-r11`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Fine-tune the admin package-create flow so the default type matches common usage and staff get stronger balance reminders while creating packages.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-defaults-and-reminders.md`
- Risk impact (if any): Low. This changes package-create defaults and reminders only; package validation, package creation API behavior, settlement mode rules, and package ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - the default create type now starts from `HOURS / 课时包`
  - common minute presets are available for quick entry
  - selecting a student now shows active-package and same-course reminders before creation
- Rollback point: previous production commit before `2026-04-01-r11`.

## 2026-04-01-r12

- Release ID: `2026-04-01-r12`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add smarter course-based defaults and stronger duplicate-package warnings to the admin package-create flow.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-smart-defaults.md`
- Risk impact (if any): Low. This changes package-create suggestions and warnings only; package validation, package creation API behavior, settlement mode rules, and package ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - selecting a course now auto-suggests the most common minute balance used for that course
  - step 4 now shows a yellow warning when the same student already has active packages for the same course
  - manual minute edits still work and are not overwritten after staff starts typing
- Rollback point: previous production commit before `2026-04-01-r12`.

## 2026-04-01-r13

- Release ID: `2026-04-01-r13`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Align package-create minute presets and fallback suggestions with the teaching-office's real package patterns.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-create-minute-patterns.md`
- Risk impact (if any): Low. This only changes create-form defaults and preset chips; package creation API behavior, validation rules, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - normal package creation now shows 10h / 20h / 40h / 100h presets
  - New Oriental partner students now show 45-minute lesson presets (6 / 8 / 10 / 20 / 40 lessons)
  - course-based minute suggestions still work, and manual minute edits are not overwritten
- Rollback point: previous production commit before `2026-04-01-r13`.

## 2026-04-01-r14

- Release ID: `2026-04-01-r14`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make package creation default to ACTIVE and reduce mistakes in the package edit and top-up flow.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-topup-clarity.md`
- Risk impact (if any): Low. This changes admin package-create/edit presentation and defaults only; package creation API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - new packages now default to `ACTIVE`
  - edit and top-up now appear as separate focused flows inside the package modal
  - top-up now shows before/after balance summary and realistic quick presets for regular and New Oriental package patterns
- Rollback point: previous production commit before `2026-04-01-r14`.

## 2026-04-01-r15

- Release ID: `2026-04-01-r15`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce remaining package edit noise by hiding less-common fields and adding a stronger human confirmation in top-up.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-topup-followup-polish.md`
- Risk impact (if any): Low. This only changes the admin package modal presentation; package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - edit mode now keeps less-common fields inside a collapsed advanced block
  - paid-only fields in edit mode only expand when staff explicitly mark the package as paid
  - top-up now shows a clearer human confirmation sentence before submit
- Rollback point: previous production commit before `2026-04-01-r15`.

## 2026-04-01-r16

- Release ID: `2026-04-01-r16`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add a clear package context card to the edit and top-up modal so staff can always see which student and course they are working on.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-context-card.md`
- Risk impact (if any): Low. This only changes package modal presentation; package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - the package modal now shows a top context card with student, course, source, status, remaining balance, and total balance
  - switching between `Edit package / 编辑课包` and `Top-up / 增购` keeps the current package context visible at the top
- Rollback point: previous production commit before `2026-04-01-r16`.

## 2026-04-01-r17

- Release ID: `2026-04-01-r17`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make the package modal switch more clearly between edit and top-up by moving the active form directly under the package context card.
- Key files:
  - `app/admin/_components/PackageEditModal.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-edit-topup-mode-layout.md`
- Risk impact (if any): Low. This only changes admin package modal presentation; package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - switching to `Top-up / 增购` now brings the top-up form immediately under the fixed package context card
  - the always-visible divider between edit and top-up content is removed, so staff no longer feel like they are still inside the edit form when they switch modes
- Rollback point: previous production commit before `2026-04-01-r17`.

## 2026-04-01-r18

- Release ID: `2026-04-01-r18`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Replace hard-to-scan shared student and shared course multi-selects with searchable add/remove pickers in package create and edit flows.
- Key files:
  - `app/admin/_components/SearchableMultiSelect.tsx`
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-shared-selector-search.md`
- Risk impact (if any): Low. This only changes the admin package create/edit presentation; package creation API behavior, package update API behavior, top-up API behavior, settlement mode rules, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - shared students and shared courses can now be searched and added as tags instead of using long native multi-select lists
  - the current student and current course are excluded from their own sharing pickers to reduce accidental self-selection
  - shared student results now show source and active-package context to reduce misclicks when names are similar
- Rollback point: previous production commit before `2026-04-01-r18`.

## 2026-04-01-r19

- Release ID: `2026-04-01-r19`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add selected-sharing summaries and same-course warnings to package create/edit so teaching staff can see sharing scope before saving.
- Key files:
  - `app/admin/packages/PackageCreateFormClient.tsx`
  - `app/admin/_components/PackageEditModal.tsx`
  - `app/admin/packages/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-package-sharing-warning-summary.md`
- Risk impact (if any): Low. This only adds package form guidance; package creation API behavior, package update API behavior, top-up API behavior, settlement mode rules, overlap checks, and ledger writes remain unchanged.
- Verification:
  - `npm run build` passed
  - package create and package edit now show selected shared-student and shared-course counts with quick name previews
  - when selected shared students already have an active package for the same course, the form shows a yellow warning before staff save
- Rollback point: previous production commit before `2026-04-01-r19`.

## 2026-04-01-r20

- Release ID: `2026-04-01-r20`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Turn teacher payroll into a more focused workbench with a role-based work queue and anomaly filters on the detail page.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-work-queue.md`
- Risk impact (if any): Low. This changes payroll page structure and filtering only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - payroll overview now shows a role-aware `My work queue / 我的待处理` and a `Selected payroll / 当前处理老师` action panel
  - teacher payroll detail now supports quick anomaly filters for pending rows, fallback-rate rows, and cancelled-but-charged rows
- Rollback point: previous production commit before `2026-04-01-r20`.

## 2026-04-01-r21

- Release ID: `2026-04-01-r21`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add finance batch payout, exception summaries, and approval timeline guidance to the teacher payroll workflow.
- Key files:
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-batch-and-summary.md`
- Risk impact (if any): Low. This only changes teacher payroll page workflow and summary presentation; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - finance can batch-mark multiple finance-ready teachers as paid from the payroll work queue
  - the selected payroll panel now highlights pending sessions, fallback-rate combos, cancelled-but-charged sessions, and approval history
  - teacher payroll detail now opens with exception summary cards before the combo/session tables
- Rollback point: previous production commit before `2026-04-01-r21`.

## 2026-04-01-r22

- Release ID: `2026-04-01-r22`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Clarify teacher payroll status on the teacher side, add anomaly-summary deep links, and surface finance-ready currency grouping for payroll payout.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/[teacherId]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-status-followup.md`
- Risk impact (if any): Low. This changes payroll page guidance, status wording, and navigation only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher payroll now shows a bilingual current-status card with sent, teacher-confirmed, manager-approved, finance-confirmed, and paid milestones
  - payroll detail anomaly summary cards now deep-link into the matching filtered rows
  - finance-ready payroll queue now shows a currency grouping summary before batch payout
- Rollback point: previous production commit before `2026-04-01-r22`.

## 2026-04-01-r23

- Release ID: `2026-04-01-r23`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Add clearer current-owner and next-step guidance to the teacher payroll self-service page.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-owner-guidance.md`
- Risk impact (if any): Low. Teacher-side wording and status guidance only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher payroll status card now shows the current owner and the next expected step in bilingual wording
  - manager/finance waiting states now explicitly name the next handling side instead of only showing a status label
- Rollback point: previous production commit before `2026-04-01-r23`.

## 2026-04-01-r24

- Release ID: `2026-04-01-r24`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Make teacher payroll more action-oriented for teachers and add cleaner finance grouping context for payout.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `app/admin/reports/teacher-payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-payroll-action-clarity.md`
- Risk impact (if any): Low. Teacher-side guidance and finance queue grouping only; payroll calculation logic, send flow, approval rules, finance payout rules, and audit logging remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher payroll now shows a stronger action-needed banner plus a visual timeline for send/confirm/approve/payout milestones
  - finance-ready payroll queue now breaks currency groups into clean vs issue-carrying teachers before batch payout
- Rollback point: previous production commit before `2026-04-01-r24`.

## 2026-04-01-r25

- Release ID: `2026-04-01-r25`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: First-round teacher portal cleanup with a today-first dashboard, grouped teacher navigation, and teacher-side language switching.
- Key files:
  - `app/api/teacher/language/route.ts`
  - `app/teacher/TeacherLanguageSelectorClient.tsx`
  - `app/teacher/layout.tsx`
  - `app/teacher/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-first-pass.md`
- Risk impact (if any): Low. This changes teacher-side layout, navigation, and language selection only; teacher auth, attendance, feedback, availability, payroll, and expense-claim business rules remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher portal now groups navigation into `Today / My Work / Schedule / Finance`
  - teacher homepage now opens with a task-oriented dashboard instead of a flat menu-style page
  - teachers can switch `中文 / English / Bilingual` from the teacher layout without needing admin-side pages
- Rollback point: previous production commit before `2026-04-01-r25`.

## 2026-04-01-r26

- Release ID: `2026-04-01-r26`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Unify the first-screen look and task framing across high-frequency teacher pages.
- Key files:
  - `app/teacher/_components/TeacherWorkspaceHero.tsx`
  - `app/teacher/sessions/page.tsx`
  - `app/teacher/availability/page.tsx`
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-high-frequency-pages.md`
- Risk impact (if any): Low. This changes teacher-side page framing, summary cards, and quick-entry presentation only; attendance, availability, expense-claim, and payroll business logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher sessions now opens with a unified teacher workspace hero and summary cards for today, next 30 days, pending feedback, and overdue feedback
  - teacher availability now opens with the same workspace shell plus clear summaries for covered days, ranges, next 7 days, and undo state
  - teacher expense claims and teacher payroll now use the same teacher-first page framing and top summary cards as the new dashboard
- Rollback point: previous production commit before `2026-04-01-r26`.

## 2026-04-01-r27

- Release ID: `2026-04-01-r27`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the refreshed teacher workspace framing to alerts, student feedbacks, and tickets.
- Key files:
  - `app/teacher/alerts/page.tsx`
  - `app/teacher/student-feedbacks/page.tsx`
  - `app/teacher/tickets/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-supporting-pages.md`
- Risk impact (if any): Low. This is a teacher-side presentation and navigation pass only; alert sync rules, feedback read/write logic, ticket transitions, proof links, and completion actions remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher alerts now opens with the same teacher workspace hero and summary-card framing as the refreshed dashboard and high-frequency pages
  - teacher student feedbacks now starts with clear handoff-focused summaries and a dedicated filter section instead of dropping teachers directly into a long list
  - teacher tickets now opens with the same task-oriented framing plus open/urgent/missing-proof summaries before the board table
- Rollback point: previous production commit before `2026-04-01-r27`.

## 2026-04-01-r28

- Release ID: `2026-04-01-r28`
- Date/Time (Asia/Shanghai): `2026-04-01`
- Deployment status: `LIVE` after deploy completion
- Scope: Extend the refreshed teacher workspace framing to teacher card and midterm report pages.
- Key files:
  - `app/teacher/card/page.tsx`
  - `app/teacher/midterm-reports/page.tsx`
  - `app/teacher/midterm-reports/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260401-teacher-portal-card-and-midterm.md`
- Risk impact (if any): Low. This is a teacher-side presentation pass only; intro editing, midterm report save/submit behavior, report locking, and PDF export logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher card now starts with the same teacher workspace hero and summary cards before intro editing and PDF export
  - teacher midterm report list now starts with the same workspace hero and summary cards before the task table
  - teacher midterm report detail now starts with a clearer context hero and report summary cards before the form body
- Rollback point: previous production commit before `2026-04-01-r28`.

## 2026-04-02-r01

- Release ID: `2026-04-02-r01`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Reduce first-screen density on the teacher expense-claims and teacher payroll pages.
- Key files:
  - `app/teacher/expense-claims/page.tsx`
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-finance-density-followup.md`
- Risk impact (if any): Low. This is a teacher-side presentation pass only; expense-claim submission, resubmission, withdrawal, payroll confirmation, payroll calculation, and approval workflow logic remain unchanged.
- Verification:
  - `npm run build` passed
  - teacher expense claims now starts with action-first cards, keeps new-claim creation in a lighter secondary section, and hides the full claim table inside a history disclosure unless filters are active
  - teacher payroll now focuses first on current action/status, removes repeated status blocks, and keeps detailed calculation tables behind a collapsible section
- Rollback point: previous production commit before `2026-04-02-r01`.

## 2026-04-02-r02

- Release ID: `2026-04-02-r02`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Collapse low-priority teacher sidebar groups and page guides to reduce bilingual-mode density.
- Key files:
  - `app/teacher/layout.tsx`
  - `app/teacher/TeacherSidebarNavClient.tsx`
  - `app/teacher/_components/TeacherWorkspaceHero.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-sidebar-collapse-followup.md`
- Risk impact (if any): Low. This is a teacher-side navigation and presentation pass only; no teacher auth, attendance, availability, payroll, expense-claim, or report business rules changed.
- Verification:
  - `npm run build` passed
  - teacher sidebar groups now collapse by section and auto-open the active area
  - teacher page guides now sit behind `Quick guide / 快速说明`, reducing first-screen text density in bilingual mode
- Rollback point: previous production commit before `2026-04-02-r02`.

## 2026-04-02-r16

- Release ID: `2026-04-02-r16`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Expand remembered student-desk context so the admin students workbench restores the last queue plus lightweight filters when reopened without explicit URL params.
- Key files:
  - `app/admin/students/page.tsx`
  - `app/admin/students/AdminStudentsClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-students-desk-memory.md`
- Risk impact (if any): Low. This is a student-workbench context and presentation change only; student creation, deletion, filtering semantics, pagination semantics, and student profile/business data logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3319` confirmed `/admin/students` restores the remembered queue plus `q / sourceChannelId / studentTypeId / pageSize` when opened without explicit URL params
  - the resumed-desk banner appears only on the plain reopen path and stays suppressed when explicit `view` or `q` params are present
- Rollback point: previous production commit before `2026-04-02-r16`.

## 2026-04-02-r17

- Release ID: `2026-04-02-r17`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: Add remembered todo-desk context plus first-screen next-step shortcuts to the admin Todo Center.
- Key files:
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-todos-desk-memory-and-shortcuts.md`
- Risk impact (if any): Low. This is a todo-workbench context and presentation change only; attendance task calculation, reminder confirmation, conflict audit, deduction repair, and renewal-alert business logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3320` confirmed `/admin/todos` reopens with the remembered desk context and shows the resumed-desk banner plus next-step shortcut bar when no explicit URL params are present
  - explicit `warnDays` / `pastDays` URL params still suppress the resumed-desk banner so one-off deep links keep priority over remembered state
- Rollback point: previous production commit before `2026-04-02-r17`.

## 2026-04-02-r18

- Release ID: `2026-04-02-r18`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: turn the existing upload recovery page into an attachment-health workbench and unify finance anomaly entry points toward it.
- Key files:
  - `app/admin/recovery/uploads/page.tsx`
  - `app/admin/layout.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-attachment-health-desk.md`
- Risk impact (if any): Low. This is an admin navigation, access, and presentation pass only; attachment storage rules, recovery/backfill matching, receipt approval logic, expense approval logic, and ticket workflow logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3321` confirmed `/admin/recovery/uploads` renders the new `Attachment Health Desk` workbench, source-filter reopen still works, and both receipts/expense pages expose the new desk entry
  - finance access to `/admin/recovery/uploads` was added through the admin layout allowlist rather than a new auth model
- Rollback point: previous production commit before `2026-04-02-r18`.

## 2026-04-02-r19

- Release ID: `2026-04-02-r19`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: add a sticky action bar plus section return links to the admin student detail page.
- Key files:
  - `app/admin/students/[id]/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-student-detail-action-bar.md`
- Risk impact (if any): Low. This is a student-detail presentation and navigation pass only; student edit logic, quick-schedule submission logic, attendance filter logic, package/billing logic, and session action logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3322` confirmed the student detail page renders the new `Student workbench`, exposes `Back to action bar`, and includes the new `#enrollments`, `#quick-schedule`, and `#edit-student` anchors
- Rollback point: previous production commit before `2026-04-02-r19`.

## 2026-04-02-r20

- Release ID: `2026-04-02-r20`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: add reusable templates plus quick date-copy actions to teacher availability.
- Key files:
  - `app/teacher/availability/TeacherAvailabilityClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-availability-templates-and-copy.md`
- Risk impact (if any): Low. This is a teacher-side availability interaction pass only; availability overlap rules, clear-day rules, undo rules, and slot save/delete APIs remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3323` confirmed `/teacher/availability` renders `Common templates`, `Quick Copy by Date`, `Copy +1d`, and `Copy +7d`
- Rollback point: previous production commit before `2026-04-02-r20`.

## 2026-04-02-r21

- Release ID: `2026-04-02-r21`
- Date/Time (Asia/Shanghai): `2026-04-02`
- Deployment status: `LIVE` after deploy completion
- Scope: add clearer completion-state guidance to the teacher session-detail page so attendance completion flows into feedback and saved feedback feels finished.
- Key files:
  - `app/teacher/sessions/[id]/page.tsx`
  - `app/teacher/sessions/[id]/TeacherAttendanceClient.tsx`
  - `app/teacher/sessions/[id]/TeacherFeedbackClient.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260402-teacher-session-completion-guidance.md`
- Risk impact (if any): Low. This is a teacher-side session guidance and presentation pass only; attendance save logic, feedback submit logic, routing, and permissions remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3324` confirmed `/teacher/sessions/ee0a433a-3b5c-4ab3-94fc-38e0a95faf7a` renders `Completion state`, preserves the existing status summary cards, and shows the new attendance/feedback completion guidance copy
- Rollback point: previous production commit before `2026-04-02-r21`.

## 2026-04-03-r01

- Release ID: `2026-04-03-r01`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: trim repeated first-screen copy on teacher payroll so the page says the workflow once instead of repeating the same status in multiple summary blocks.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-payroll-density-trim.md`
- Risk impact (if any): Low. This is a teacher-side payroll presentation pass only; payroll calculation, confirmation, approval, payout, and finance-return logic remain unchanged.
- Verification:
  - `npm run build` passed
  - fresh local logged-in QA on `http://127.0.0.1:3325/teacher/payroll` confirmed the page still loads correctly for the current empty-state teacher account
  - current local and production teacher account state is `Admin has not sent this month's payroll yet`, so this release was verified against the empty-state shell plus build output rather than a live sent-payroll record
- Rollback point: previous production commit before `2026-04-03-r01`.

## 2026-04-03-r02

- Release ID: `2026-04-03-r02`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: hotfix duplicated bilingual labels on teacher payroll where some strings were manually written as bilingual text before passing through the bilingual helper.
- Key files:
  - `app/teacher/payroll/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-teacher-payroll-bilingual-duplication-hotfix.md`
- Risk impact (if any): Low. This is a teacher-side payroll copy hotfix only; payroll calculation, confirmation, approval, payout, and finance-return logic remain unchanged.
- Verification:
  - `npm run build` passed
  - local source audit confirmed duplicated labels such as `What happens next`, `Current owner`, `Timeline`, stage pills, and owner labels now use normal `t(lang, en, zh)` strings instead of pre-built bilingual text
  - the current local and production teacher account still lands on the payroll empty state for this month, so this release was verified through source-path cleanup plus build output rather than a live sent-payroll record
- Rollback point: previous production commit before `2026-04-03-r02`.

## 2026-04-03-r03

- Release ID: `2026-04-03-r03`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: make a first admin-side copy-clarity pass on high-frequency workbench pages to reduce slash-heavy or mixed-language labels.
- Key files:
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/students/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-admin-copy-clarity-pass-1.md`
- Risk impact (if any): Low. This is an admin-side copy cleanup only; receipt queue behavior, settlement/invoice behavior, and student-search behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - targeted copy audit confirmed the updated wording for receipt file-issue links, partner-settlement invoice grouping/status labels, and the student search placeholder
- Rollback point: previous production commit before `2026-04-03-r03`.

## 2026-04-03-r12

- Release ID: `2026-04-03-r12`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: tighten shared mobile layout containment and remove the remaining narrow-screen overflow on teacher payroll / expense workbenches and the admin receipt-approval workflow.
- Key files:
  - `app/layout.tsx`
  - `app/responsive-layout.css`
  - `app/teacher/_components/TeacherWorkspaceHero.tsx`
  - `app/teacher/payroll/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-mobile-shell-and-form-overflow-pass.md`
- Risk impact (if any): Low. This is a responsive UI containment pass only; payroll logic, receipt approval logic, payment-record handling, receipt creation logic, and remembered queue behavior remain unchanged.
- Verification:
  - `npm run build` passed
  - local mobile-width QA on `http://127.0.0.1:3330/teacher/payroll` confirmed stacked hero actions, stacked payroll filters, and `scrollWidth === clientWidth`
  - local mobile-width QA on `http://127.0.0.1:3330/teacher/expense-claims` confirmed no horizontal overflow on the shared teacher workbench shell
  - local mobile-width QA on `http://127.0.0.1:3330/admin/receipts-approvals` confirmed the quick package selector and receipt finance forms no longer overflow, and `scrollWidth === clientWidth`
- Rollback point: previous production commit before `2026-04-03-r12`.

## 2026-04-03-r19

- Release ID: `2026-04-03-r19`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: audit and fix the remaining remembered-workbench pages so explicit blank filter submissions and reset links no longer revive stale remembered queue state.
- Key files:
  - `app/admin/students/page.tsx`
  - `app/admin/feedbacks/page.tsx`
  - `app/admin/expense-claims/page.tsx`
  - `app/admin/receipts-approvals/page.tsx`
  - `app/admin/reports/partner-settlement/page.tsx`
  - `app/admin/todos/page.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-remembered-filter-blank-param-audit.md`
- Risk impact (if any): Low. This only changes remembered-filter resume rules and default reset links on workbench pages; no package, receipt, expense, settlement, todo, or student business logic changes.
- Verification:
  - `npm run build` passed
  - production read-only QA confirmed explicit reset routes now bypass remembered state on `packages`, `students`, `expense-claims`, `receipts-approvals`, `partner-settlement`, and `todos`
  - production read-only QA confirmed explicit blank query submissions such as `paid=` on packages and `q=` on packages no longer resurrect the previous remembered value
  - post-deploy startup check confirmed `local / origin / server = bd33bef`
  - release docs were synced in a follow-up docs-only commit so the release gate stays aligned with production
- Rollback point: previous production commit before `2026-04-03-r19`.

## 2026-04-03-r20

- Release ID: `2026-04-03-r20`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: add a dedicated `Final Reports / 结课报告` workflow with a new DB model, teacher-side fill flow, and admin-side assign/forward center for completed `HOURS` packages.
- Key files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260403202000_add_final_reports/migration.sql`
  - `lib/final-report.ts`
  - `app/teacher/final-reports/page.tsx`
  - `app/teacher/final-reports/[id]/page.tsx`
  - `app/teacher/layout.tsx`
  - `app/admin/reports/final/page.tsx`
  - `app/admin/layout.tsx`
  - `docs/CHANGELOG-LIVE.md`
  - `docs/RELEASE-BOARD.md`
  - `docs/tasks/TASK-20260403-final-reports-phase-1-and-2.md`
- Risk impact (if any): Medium. This release adds a new Prisma enum/table and new teacher/admin routes, but it does not change midterm-report logic, attendance/deduction logic, package balances, or finance logic.
- Verification:
  - `npm run prisma:generate` passed
  - `npm run build` passed
  - post-deploy startup check confirmed the new release commit is aligned on local / origin / server
  - production read-only QA confirmed the new teacher and admin final-report pages render and the navigation entries are visible
  - release task record was synced in a follow-up docs pass so handoff docs stay aligned with the deployed state
  - final docs sync pass bundled changelog / release board / task in one commit for the release gate
- Rollback point: previous production commit before `2026-04-03-r20`.

## 2026-04-03-r21

- Release ID: `2026-04-03-r21`
- Date/Time (Asia/Shanghai): `2026-04-03`
- Deployment status: `LIVE` after deploy completion
- Scope: complete the first final-report workflow with admin PDF export and a clearer forwarded-to-parent action.
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
