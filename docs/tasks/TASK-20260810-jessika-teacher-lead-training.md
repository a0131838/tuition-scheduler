# TASK-20260810-jessika-teacher-lead-training

## 1) Request

- Request ID: `2026-08-10-jessika-teacher-lead-training`
- Requested by: Owner
- Date: `2026-08-10`
- Original requirement: Keep Jessika's existing teacher access, add teacher-management and training-material duties, and prevent access to company finance.

## 2) Scope Control

- In scope: teacher schedule oversight, teacher quality feedback, teacher-only training sign-off, controlled teacher training materials and Jessika's Teacher Lead ACL.
- Out of scope: company finance, partner settlement, payroll administration, bank/payment data, invoice/receipt administration, scheduling writes and a new broad Admin account.
- Must keep unchanged: Jessika's teacher profile, teaching workflow, existing teacher self-service compensation pages, finance roles, Manager ACL, lesson/attendance/package data and all existing training records.

## 3) Findings (Read-only Phase)

- Root cause: the existing `TEACHER` role was safe for teaching but did not expose teacher-management or controlled training-material workflows. `ADMIN` or `ManagerAcl` would be too broad because they can enter company finance routes.
- Affected modules: teacher lead portal, management feedback, staff training and shared documents.
- Impact level: medium, permission-sensitive but schema-free.

## 4) Plan (Before Edit)

1. Reuse the existing Teacher Lead ACL instead of creating a second broad account.
2. Add teacher-quality oversight without finance data or schedule mutations.
3. Allow teacher-only training review with a server-side target-role check.
4. Add draft, owner review, publish, revision and archive controls for teacher training materials.
5. Test permission boundaries, build, deploy and enable Jessika's existing account.

## 5) Changes Made

- Files changed: teacher lead navigation/quality page, training centre/manage/actions, teacher-training material library/API/helper, scoped permission tests and release documentation.
- Logic changed: Teacher Leads can inspect teaching/feedback completion, send internal teacher feedback, sign off teacher training only, and prepare training materials. Only the owner can publish, return or archive materials.
- Logic explicitly not changed: no Admin role, no Manager ACL, no finance workspace, no finance/payroll administration, no schedule edit permission, no schema migration and no historical data rewrite.

## 6) Verification

- Build: 27 focused training/permission tests, 180 backend regressions, TypeScript and the 245-page production build passed.
- Runtime: verify local/GitHub/server commit alignment, PM2 process and `/admin/login` HTTP 200 after deployment.
- Key manual checks: Jessika remains `TEACHER`, has an active `TeacherLeadAcl`, has no `ManagerAcl`, and can open Teacher Lead/quality/training pages without company finance access.

## 7) Risks / Follow-up

- Known risks: Teacher Leads can view internal quality feedback for all teachers by design. Publication remains owner-only to keep training content controlled.
- Follow-up tasks: add Jessika to the separate AI test system as `ACADEMIC` only if she joins that UAT; do not reuse the formal-system ACL as an AI permission grant.

## 8) Release Record

- Release ID: `2026-08-10-r355`
- Deploy time: pending
- Rollback command/point: previous production head `5462b10b56a6a204163dcd2512f26a690cf1bd3f`.
