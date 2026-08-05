import {
  EduTrustCourseFileStatus,
  EduTrustPermissionStatus,
  EduTrustStudentRecordStatus,
  StudentContractMode,
} from "@prisma/client";

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

export function inferEduTrustStudentRecordStatus(input: {
  diagnosticAssessment?: unknown;
  individualLearningPlan?: unknown;
  progressReview?: unknown;
  finalAssessment?: unknown;
  completionRecord?: unknown;
  outcomeSummary?: unknown;
  requestedStatus?: EduTrustStudentRecordStatus | null;
}) {
  if (
    input.requestedStatus === EduTrustStudentRecordStatus.COMPLETED ||
    input.requestedStatus === EduTrustStudentRecordStatus.NEEDS_REVIEW
  ) {
    return input.requestedStatus;
  }

  const core = [
    input.diagnosticAssessment,
    input.individualLearningPlan,
    input.progressReview,
    input.finalAssessment,
    input.completionRecord,
  ];
  if (core.every(hasText)) return EduTrustStudentRecordStatus.READY_FOR_REVIEW;
  if (core.some(hasText) || hasText(input.outcomeSummary)) return EduTrustStudentRecordStatus.IN_PROGRESS;
  return EduTrustStudentRecordStatus.DRAFT;
}

export function isEduTrustCourseContractReady(profile: {
  isEduTrustCourse: boolean;
  permissionStatus: EduTrustPermissionStatus;
  courseFileStatus: EduTrustCourseFileStatus;
}) {
  return (
    profile.isEduTrustCourse &&
    profile.permissionStatus === EduTrustPermissionStatus.PERMITTED &&
    profile.courseFileStatus === EduTrustCourseFileStatus.APPROVED
  );
}

export function isEduTrustPackageHoursReady(input: {
  totalMinutes: number | null | undefined;
  minTotalHours: number | null | undefined;
}) {
  const minHours = Math.max(1, Number(input.minTotalHours ?? 50));
  return Number(input.totalMinutes ?? 0) >= minHours * 60;
}

export function studentContractModeLabel(mode: StudentContractMode) {
  if (mode === StudentContractMode.SSG_STANDARD_PEI_V4) return "SSG Standard PEI-Student Contract v4.0";
  if (mode === StudentContractMode.FULL_CARE_AGREEMENT) return "Full Care Service Agreement / 全程托管服务合同";
  return "Tuition Agreement";
}
