# TASK — School Guide Academic Assessment Pilot

## 1) Request

- Request ID: `school-guide-academic-assessment-pilot-20260805`
- Requested by: Zhao Hongwei
- Date: 2026-08-05
- Original requirement: implement the confirmed 30–45 minute assessment plan in the miniapp, using the approved blueprint, while preserving all existing web and miniapp functions.

## 2) Scope Control

- In scope: invitation codes, age/path intake, A/B/C form allocation, anchor routing, answer persistence, resume, manual review, internal report, operation log and native miniapp entry points.
- Out of scope: public unrestricted launch, official school/MOE/AEIS score claims, percentile/norm claims, automatic admission prediction, billing, package purchase and automated course sales.
- Must keep unchanged: existing 2-minute pathway check, school catalog, web scheduling, attendance, packages, invoices, receipts, payroll, teacher payroll and parent-account functions.

## 3) Findings (Read-only Phase)

- Root cause: the existing `guide-assessment` page only calculates possible school pathways from age, identity and system preference. It does not measure academic readiness, issue assessment codes, save answers, route by anchors or support teacher scoring.
- Affected modules: public school-guide API, staff miniapp, public guide miniapp, isolated Prisma assessment storage and AuditLog.
- Impact level: Medium and isolated.

## 4) Plan (Before Edit)

1. Convert the verified V1.4 workbook into a server-only versioned question bank.
2. Add isolated code/session tables and audit every write.
3. Add public start/resume/answer/submit APIs without returning answers or explanations.
4. Add staff code issuance, revocation, review and correction APIs.
5. Add native miniapp student and staff pages while preserving the existing pathway screen.
6. Run focused rules, migration, syntax, TypeScript and production-build verification.
7. Deploy with the guarded workflow, then separately upload and test the WeChat experience version.

## 5) Changes Made

- Files changed: isolated assessment library/data, two Prisma models and additive migration, two public API routes, staff assessment API routes, one public miniapp page, two staff miniapp pages, existing guide/staff entry links, training operation coverage, tests and release/planning docs.
- Logic changed: assessment codes default to one use and 14 days; form allocation balances A/B/C and avoids the same form for the same nickname within 90 days; six anchors choose easy/standard/hard; DSA replaces branch/open work with four configured tasks; manual items block a final band until reviewed; completed reviews can be corrected with a separate audit action.
- Logic explicitly not changed: 2-minute pathway logic, school catalog, CRM consultation ownership, teaching, scheduling, attendance, finance and payroll.

## 6) Verification

- Build: the latest-production integration passed `npm run build`; 240 application routes/pages were generated and the five new API routes were included.
- Runtime: guarded release completed at feature commit `8aee04fdc1f2334daf0e79cb3a855882cf4ce919`; local/GitHub/server were aligned, PM2 PID `1130086` was online with zero restarts, `/admin/login` returned 200, catalog returned 43 schools, invalid code returned controlled 409 and anonymous staff access returned 401.
- Key checks: Prisma validation/generation passed; 15 forms/504 assignments/279 questions/132 path assignments converted; 12 focused tests and all 135 backend tests passed; the 61-page Mini Program audit passed; all single-choice items expose options; student DTOs exclude answers/explanations; Mini Program JavaScript syntax, app.json parsing and `git diff --check` passed.

## 7) Risks / Follow-up

- Known risks: the source bank remains `pilot`; high-age reasoning content remains a documented gap; real-device visual and interruption tests require the WeChat experience version; statistical calibration is not yet available.
- Follow-up tasks: complete controlled student pilot, review timing and scoring evidence, close severe item issues, meet the published sample/double-scoring gate, then approve items in batches before considering wider access.

## 8) Release Record

- Release ID: `2026-08-05-r312`
- Deploy time: 2026-08-05 (Asia/Singapore); WeChat development version `1.0.24` uploaded successfully at 673,220 bytes. It has not been submitted for formal review.
- Rollback command/point: revert the r312 commit and deploy the previous runtime; pre-release production point is `1392ae6b06b1a364aea6571d1bf9ff30bb5d92a5`.
