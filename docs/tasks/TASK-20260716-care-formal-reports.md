# TASK-20260716 Care Formal Reports

Release candidate: `2026-07-16-r255`

## Objective

Deliver an isolated formal-report workflow for pre-university care while keeping university parent reporting consent-aware and leaving all teaching, finance, payroll and partner settlement behavior unchanged.

## Confirmed Business Rules

- Pre-university academic/full care is the primary business focus.
- Formal reporting is evidence-led and intended to reduce uncertainty through facts, judgement, actions and next steps.
- University service remains lightweight; parent access requires adult-student consent and `formal_reports` visibility.
- Jasmine is the current operational/academic owner. zhao hongwei is final reviewer and backup owner.
- Candidate pilot students remain selectable configuration, not hard-coded data.

## Implementation

- Add isolated `CareReport`, source-link and parent-view tables.
- Support monthly, milestone, significant-event and term reports.
- Generate draft content and source snapshots from Sessions, Feedback, CareActivity, CareTask and CareAttachment.
- Enforce draft, submit, return, approve, publish and revoke transitions with optimistic locking and AuditLog entries.
- Prevent submission without evidence or while generated placeholders remain.
- Lock approved/published content; parent output never includes `internalNote`.
- Add admin report workspace and reviewed PDF export.
- Add parent miniapp list, detail, PDF and acknowledgement flows.
- Record first/last view, view count and acknowledgement time.

## Compatibility Boundary

- Migration is additive and creates only report-related enums/tables.
- No existing Student, Session, Attendance, CoursePackage, PackageTxn, Partner, PartnerSettlement, Invoice, Receipt, payroll or billing row is updated.
- Existing care projects, activities, tasks and attachments remain unchanged and become read-only source references when selected into a report.
- Parent portal permissions continue to use the existing `canViewReports` switch.

## Verification Checklist

- [x] Prisma validate and generate
- [x] TypeScript check
- [x] Focused report and migration-safety tests (7/7)
- [x] Full backend test suite (73/73)
- [x] Miniapp JavaScript syntax and release audit (30 pages)
- [x] Production build (193 pages)
- [x] Git diff check
- [x] PDF render review (two populated A4 pages, no blank footer pages)
- [x] Release preflight and deployment (`d926d5d`)
- [x] Production migration, PM2, HTTP and authenticated workflow checks
- [x] Protected production counts reconciled; one concurrent normal attendance creation documented
- [x] Long-term planning document synced to the personal knowledge base
