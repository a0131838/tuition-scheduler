# TASK-20260803-same-day-family-course-reminders

## 1) Request

- Request ID: `TASK-20260803-same-day-family-course-reminders`
- Requested by: Management / Academic Operations
- Date: `2026-08-03`
- Original requirement: explain why Su Xinyuan's class was absent from the reminder sent for her brother Steven, then make reminder generation resilient to frequent same-day course adjustments and combine siblings only when the system has an explicit shared parent relationship.

## 2) Scope Control

- In scope: scan both the current Singapore day and next day; create an urgent supplementary task for a future class added on the same day; group children linked to the same active parent into one parent reminder; label every child in a combined reminder; generate the existing audited correction flow after a sent course reminder changes.
- Out of scope: creating or merging parent accounts, guessing family relationships from names or shared packages, automatically sending WeChat messages, rewriting sent evidence, or changing schedule and package records.
- Must keep unchanged: attendance, package deduction, class capacity, teacher assignment, parent mini-program login, finance, contracts, payroll, and all existing reminder completion controls.

## 3) Findings (Read-only Phase)

- Root cause: the communication sync only scanned tomorrow. Steven's reminder task existed from the prior-day scan, while Su Xinyuan's class was added or became eligible on the class date and therefore never entered the manual reminder queue.
- Family state: the two students share a package, but neither has an active `ParentStudentLink`. A shared balance is not treated as proof that two students have the same reminder recipient.
- Affected modules: `lib/parent-communication-center.ts` and its focused tests.
- Impact level: moderate and isolated to communication-task generation.

## 4) Plan (Before Edit)

1. Preserve the existing tomorrow reminder behavior and add a current-day future-session scan.
2. Group only students with the same explicit active parent link and keep unlinked students separate.
3. Preserve sent reminders and use the existing high-priority correction task when course details change.
4. Verify date boundaries, family labels, change parsing, full tests, TypeScript, production build, and live reminder data.

## 5) Changes Made

- Files changed: `lib/parent-communication-center.ts`, `tests/parent-communication-center.test.ts`, and release documentation.
- Logic changed:
  - reminder sync now covers today and tomorrow in Singapore time;
  - a newly scheduled same-day class receives a high-priority task only while it is still in the future;
  - explicit siblings under one active parent receive one reminder with `【Student】` labels;
  - family-labelled schedule lines participate correctly in time, teacher, location, subject, and cancellation change detection;
  - previously sent per-student reminders are not silently replaced by a family reminder on the same date;
  - unsent legacy per-student tasks can be waived after safe family consolidation.
- Logic explicitly not changed: no reminder is sent automatically, and shared-package membership alone does not establish a family relationship.

## 6) Verification

- Build: `npm run build` passed and generated 231 pages.
- TypeScript: `npx tsc --noEmit` passed.
- Backend regression: `npm run test:backend` passed 132 tests.
- Full repository suite: `npx tsx --test tests/*.test.ts` passed 304 tests.
- Focused communication suite: 21 tests passed, including current-day boundaries, explicit family grouping, student labels, and family time-change parsing.
- Static safety: `git diff --check` passed.

## 7) Risks / Follow-up

- Known risk: students without an explicit parent link continue to receive separate tasks. This is intentional to prevent a reminder from being sent to an unverified household.
- Follow-up: bind both students to the same verified parent account through the existing parent binding workflow if future reminders should be combined.

## 8) Release Record

- Release ID: `2026-08-03-r302`
- Deploy time: pending.
- Rollback point: `b00b13c9f40ecb08cc93829a44bb17d9c5001b08`.
