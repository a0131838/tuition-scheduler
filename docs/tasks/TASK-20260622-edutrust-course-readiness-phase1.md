# TASK-20260622 EduTrust Course Readiness Phase 1

Date: 2026-06-22

## Goal

Start the EduTrust整改 without disrupting current tuition-scheduler operations.

The first implementation keeps existing operational course names unchanged and adds an EduTrust compliance mapping layer.

## Implemented

- Added `EduTrustCourseProfile` as a one-to-one profile for existing `Course`.
- Added enums for EduTrust course line, permission status, delivery mode, and course file status.
- Added default mapping suggestions:
  - `国际学校入学考试` / `EAL CAMP` -> `Preparatory Course for International School Admission`
  - `AEIS` -> `Preparatory Course for AEIS Admission`
  - `英语口语-双语教学` / `英文评估` -> `Certificate in Academic English and Communication Skills`
  - `Standardized English Tests` / `SAT` -> `Preparatory Course for Standardized English Tests`
  - `IB` / `IGCSE` / `A-Level` / `Olevel` / `WACE` -> `Academic Subject Bridging Programme`
  - `SM2` / `奖学金考试` -> `Preparatory Course for Scholarship and Selection Tests`
  - `大学` -> `Academic Support Programme for Higher Education`
- Added `/admin/edutrust` dashboard.
- Added editable mapping UI for:
  - whether a course is included as EduTrust main evidence
  - EduTrust course line
  - compliance course name
  - public course name
  - track/pathway label
  - minimum total hours
  - delivery mode
  - SSG permission status
  - course file status
  - notes
- Added low-hour package risk count based on the configured minimum hours.
- Added API endpoint `POST /api/admin/edutrust/course-profiles` for saving mappings.
- Added admin sidebar entry `EduTrust Readiness / EduTrust 合规整改`.

## Not Changed

- Existing `Course.name` values are not renamed.
- Existing subjects, levels, classes, packages, attendance, contracts, invoices, and scheduling flows are not changed.
- Current tuition agreement remains untouched.

## Next Phases

1. Add SSG Standard PEI-Student Contract v4.0 as a separate contract mode.
2. Add diagnostic assessment, individual learning plan, progress review, final assessment, and completion record for one-to-one EduTrust courses.
3. Add C7 outcomes dashboard.
4. Add official evidence folder and Section A/B export pack.

## 2026-06-22 Follow-up: Course File Layer

Added the first Course File layer under the same `/admin/edutrust` page.

- Added `EduTrustCourseFile` as a one-to-one file for each EduTrust course profile.
- Added editable fields for:
  - course write-up
  - admission requirements
  - learning outcomes
  - syllabus
  - lesson plan
  - assessment plan
  - teacher deployment
  - Academic Board approval
  - Examination Board approval
  - course review
  - evidence notes
  - approved by
- Course File fields are folded inside each course row to keep the main mapping page usable.
- Saving a row now persists both the course mapping and any Course File content.
- Course File status is inferred automatically:
  - no file content -> `NOT_STARTED`
  - partial file content -> `DRAFTING`
  - core fields filled -> `READY_FOR_REVIEW`
  - manually selected `APPROVED` / `NEEDS_UPDATE` is respected.

## 2026-06-22 Follow-up: SSG Contract Mode Foundation

Added the foundation for a separate SSG Standard PEI-Student Contract v4.0 mode without changing existing tuition contracts.

- Added `StudentContractMode`.
- Existing and newly created normal contracts default to `TUITION_AGREEMENT`.
- Added `SSG_STANDARD_PEI_V4` as a separate contract mode.
- Added a separate SSG v4 template seed path and snapshot mode.
- Updated contract draft and ready-to-sign creation functions to accept `contractMode`.
- Updated signing preparation so snapshots are generated using the contract's stored mode.
- Added tests proving:
  - default snapshots still use the existing tuition agreement template
  - SSG mode snapshots use the separate SSG v4 template slug and include key official-control markers such as 7 working days cooling-off

This does not yet expose a production UI button for creating SSG v4 contracts. The next phase should connect this mode only to EduTrust-ready/permitted courses after we confirm the official contract fields.

## Verification

- `npx prisma format`
- `npx prisma migrate deploy`
- `npx prisma generate`
- `npm run build`
