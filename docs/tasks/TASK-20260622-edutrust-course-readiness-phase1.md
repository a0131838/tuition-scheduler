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

1. Add EduTrust course file templates and approval workflow.
2. Add SSG Standard PEI-Student Contract v4.0 as a separate contract mode.
3. Add diagnostic assessment, individual learning plan, progress review, final assessment, and completion record for one-to-one EduTrust courses.
4. Add C7 outcomes dashboard.
5. Add official evidence folder and Section A/B export pack.

## Verification

- `npx prisma format`
- `npx prisma migrate deploy`
- `npx prisma generate`
- `npm run build`
