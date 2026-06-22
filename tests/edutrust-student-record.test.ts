import assert from "node:assert/strict";
import { test } from "node:test";
import { EduTrustCourseFileStatus, EduTrustPermissionStatus, EduTrustStudentRecordStatus } from "@prisma/client";
import {
  inferEduTrustStudentRecordStatus,
  isEduTrustCourseContractReady,
  isEduTrustPackageHoursReady,
} from "@/lib/edutrust-student-record";

test("EduTrust student record status follows official evidence completeness", () => {
  assert.equal(inferEduTrustStudentRecordStatus({}), EduTrustStudentRecordStatus.DRAFT);
  assert.equal(
    inferEduTrustStudentRecordStatus({ diagnosticAssessment: "Placement test done" }),
    EduTrustStudentRecordStatus.IN_PROGRESS
  );
  assert.equal(
    inferEduTrustStudentRecordStatus({
      diagnosticAssessment: "Placement test done",
      individualLearningPlan: "Plan",
      progressReview: "Review",
      finalAssessment: "Assessment",
      completionRecord: "Completion",
    }),
    EduTrustStudentRecordStatus.READY_FOR_REVIEW
  );
  assert.equal(
    inferEduTrustStudentRecordStatus({ requestedStatus: EduTrustStudentRecordStatus.COMPLETED }),
    EduTrustStudentRecordStatus.COMPLETED
  );
});

test("SSG PEI contract readiness requires permitted course, approved file, and minimum hours", () => {
  assert.equal(
    isEduTrustCourseContractReady({
      isEduTrustCourse: true,
      permissionStatus: EduTrustPermissionStatus.PERMITTED,
      courseFileStatus: EduTrustCourseFileStatus.APPROVED,
    }),
    true
  );
  assert.equal(
    isEduTrustCourseContractReady({
      isEduTrustCourse: true,
      permissionStatus: EduTrustPermissionStatus.SUBMITTED,
      courseFileStatus: EduTrustCourseFileStatus.APPROVED,
    }),
    false
  );
  assert.equal(isEduTrustPackageHoursReady({ totalMinutes: 3000, minTotalHours: 50 }), true);
  assert.equal(isEduTrustPackageHoursReady({ totalMinutes: 2999, minTotalHours: 50 }), false);
});

