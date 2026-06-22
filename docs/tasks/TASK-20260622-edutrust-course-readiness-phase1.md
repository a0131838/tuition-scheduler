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
  - SSG mode snapshots use the separate SSG v4 template slug and include key official-control markers

This does not yet expose a production UI button for creating SSG v4 contracts. The next phase should connect this mode only to EduTrust-ready/permitted courses after we confirm the official contract fields.

## 2026-06-22 Follow-up: Student Evidence, C7 Outcomes, and Guarded SSG Entry

Added the next EduTrust readiness layer for student-level delivery evidence and outcomes tracking.

- Added `EduTrustStudentCourseRecord` for each EduTrust student/course/package evidence file.
- Added editable evidence fields for:
  - diagnostic assessment
  - individual learning plan
  - progress review
  - final assessment
  - completion record
  - attendance evidence note
  - contract/FPS evidence note
  - outcome summary
  - external outcome
  - start and completion dates
- Added `/admin/edutrust/students` as the student evidence and C7 outcomes workspace.
- Added a C7 three-year trend summary based on completed EduTrust student records.
- Added a Section A/B evidence-pack checklist covering course file approval, SSG permission evidence, signed PEI student contract, FPS/fee evidence where applicable, attendance, assessment, learning plan, progress review, completion, withdrawal/refund evidence where applicable, and yearly outcomes.
- Added `POST /api/admin/edutrust/student-records` to save student evidence records.
- Added admin sidebar entry for `EduTrust Student Evidence / EduTrust 学生证据`.
- Connected SSG Standard PEI-Student Contract v4.0 creation to the package contract workspace only when:
  - the course is marked as an EduTrust course
  - SSG permission status is `PERMITTED`
  - Course File status is `APPROVED`
  - package hours meet the configured EduTrust minimum
- Added the same SSG contract guard inside `lib/student-contract.ts` so the UI cannot be bypassed.

This still does not change live teaching delivery, scheduling, attendance deduction, package balances, invoices, receipts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw. Before issuing SSG v4 contracts externally, the final contract fields should still be checked against the official Standard PEI-Student Contract Version 4.0 template for the exact course and student case.

## 2026-06-22 Follow-up: Locked Official SSG v4 Template

Replaced the earlier SSG v4 summary shell with a locked official Standard PEI-Student Contract Version 4.0 template source.

- Added `lib/ssg-standard-pei-contract-v4.ts`.
- Extracted the official contract structure from TPGateway's Standard PEI-Student Contract Version 4.0 DOCX/PDF sources.
- Preserved the official English contract structure and Schedule A-E labels.
- Source-tagged the template with:
  - official version `4.0`
  - official PDF URL
  - official DOCX URL
  - locked official template flag
- Replaced the prior bilingual SSG summary text in `SSG_STANDARD_PEI_V4`.
- Corrected the official cooling-off wording:
  - Cooling-Off Period is ten (10) calendar days.
  - Refund processing references seven (7) working days where stated in the official template.
- System-filled fields are limited to known values:
  - PEI legal name
  - PEI registration number
  - PEI registered address
  - contracting party name
  - student name
  - course title
  - course hours
  - fee amount
  - first instalment date
- Fields not yet reliably stored in the system remain official blanks/placeholders rather than guessed values, including identity numbers, course commencement/completion dates, several Schedule A details, miscellaneous fees, and Schedule D refund percentages.
- Added tests proving the SSG template has official source metadata, the official v4 cooling-off/refund markers, Schedule A-E, and no duplicated Schedule E extraction artifact.

## 2026-06-22 Follow-up: Contract Schedule Setup

Added the missing course-level setup layer for official SSG Standard PEI-Student Contract v4.0 Schedule fields.

- Added `EduTrustContractSetup` as a one-to-one setup record for each EduTrust course profile.
- Added `/admin/edutrust` folded Contract Schedule Setup fields for:
  - permitted course duration
  - course load mode
  - course commencement/completion basis
  - qualification, course developer, and awarding organisation
  - course entry requirements
  - course schedule, holidays, assessment periods, results release, and qualification conferment
  - industrial attachment yes/no and duration
  - miscellaneous fees
  - Schedule D refund percentages and day thresholds
  - late-payment grace period
  - FPS provider and policy number where applicable
  - evidence notes
- Extended `POST /api/admin/edutrust/course-profiles` to save the contract setup together with the course mapping and Course File.
- Updated the official SSG v4 template placeholders so Schedule A-D values are filled from the setup instead of remaining blank where the system now has approved values.
- Updated contract snapshot generation so SSG contracts inherit course-level setup values plus package start/end dates.
- Added a sign-link guard for SSG v4 contracts:
  - staff may still create a draft only after the course is EduTrust-ready/permitted/approved and meets hour minimums
  - the system will not prepare/send the SSG sign link until required Schedule A-D values are complete
  - if FPS is marked required, provider and policy number are also required before signing
- Normal tuition contracts remain unchanged and continue to use `TUITION_AGREEMENT`.

## Verification

- `npx prisma format`
- `npx prisma migrate deploy`
- `npx prisma generate`
- `npx tsx --test tests/edutrust-student-record.test.ts tests/student-contract-mode.test.ts`
- `npm run build`
