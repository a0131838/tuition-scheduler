import {
  EduTrustCourseFileStatus,
  EduTrustCourseLine,
  EduTrustDeliveryMode,
  EduTrustPermissionStatus,
} from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function enumValue<T extends Record<string, string>>(values: T, raw: unknown, fallback: T[keyof T]) {
  const value = String(raw ?? "").trim();
  return Object.values(values).includes(value) ? (value as T[keyof T]) : fallback;
}

function trimOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function courseFileData(raw: any) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    courseWriteup: trimOrNull(source.courseWriteup),
    admissionRequirements: trimOrNull(source.admissionRequirements),
    learningOutcomes: trimOrNull(source.learningOutcomes),
    syllabus: trimOrNull(source.syllabus),
    lessonPlan: trimOrNull(source.lessonPlan),
    assessmentPlan: trimOrNull(source.assessmentPlan),
    teacherDeployment: trimOrNull(source.teacherDeployment),
    academicBoardApproval: trimOrNull(source.academicBoardApproval),
    examinationBoardApproval: trimOrNull(source.examinationBoardApproval),
    courseReview: trimOrNull(source.courseReview),
    evidenceNotes: trimOrNull(source.evidenceNotes),
    approvedBy: trimOrNull(source.approvedBy),
  };
}

function inferCourseFileStatus(input: ReturnType<typeof courseFileData>) {
  const values = Object.entries(input).filter(([key]) => key !== "approvedBy").map(([, value]) => value);
  if (values.every((value) => !value)) return EduTrustCourseFileStatus.NOT_STARTED;
  const readyFields = [
    input.courseWriteup,
    input.admissionRequirements,
    input.learningOutcomes,
    input.syllabus,
    input.assessmentPlan,
    input.teacherDeployment,
  ];
  if (readyFields.every(Boolean)) return EduTrustCourseFileStatus.READY_FOR_REVIEW;
  return EduTrustCourseFileStatus.DRAFTING;
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const courseId = String(body?.courseId ?? "").trim();
  if (!courseId) return bad("Missing courseId");

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) return bad("Course not found", 404);

  const isEduTrustCourse = Boolean(body?.isEduTrustCourse);
  const courseLine = enumValue(
    EduTrustCourseLine,
    body?.courseLine,
    isEduTrustCourse ? EduTrustCourseLine.INTERNATIONAL_SCHOOL_ADMISSION : EduTrustCourseLine.NOT_FOR_EDUTRUST
  );
  const minTotalHours = Math.max(0, Math.round(Number(body?.minTotalHours ?? 50)));
  const permissionStatus = enumValue(
    EduTrustPermissionStatus,
    body?.permissionStatus,
    isEduTrustCourse ? EduTrustPermissionStatus.DRAFT : EduTrustPermissionStatus.NOT_FOR_EDUTRUST
  );
  const fileData = courseFileData(body?.courseFile);
  const requestedCourseFileStatus = enumValue(EduTrustCourseFileStatus, body?.courseFileStatus, EduTrustCourseFileStatus.NOT_STARTED);
  const inferredCourseFileStatus =
    requestedCourseFileStatus === EduTrustCourseFileStatus.APPROVED ||
    requestedCourseFileStatus === EduTrustCourseFileStatus.NEEDS_UPDATE
      ? requestedCourseFileStatus
      : inferCourseFileStatus(fileData);

  const data = {
    isEduTrustCourse,
    courseLine,
    complianceName: trimOrNull(body?.complianceName),
    publicName: trimOrNull(body?.publicName),
    trackLabel: trimOrNull(body?.trackLabel),
    minTotalHours: minTotalHours || 50,
    deliveryMode: enumValue(EduTrustDeliveryMode, body?.deliveryMode, EduTrustDeliveryMode.ONE_TO_ONE),
    permissionStatus,
    courseFileStatus: inferredCourseFileStatus,
    note: trimOrNull(body?.note),
  };

  const profile = await prisma.eduTrustCourseProfile.upsert({
    where: { courseId },
    create: { courseId, ...data },
    update: data,
  });

  const hasFileData = Object.values(fileData).some(Boolean);
  if (hasFileData) {
    await prisma.eduTrustCourseFile.upsert({
      where: { courseProfileId: profile.id },
      create: {
        courseProfileId: profile.id,
        ...fileData,
        lastReviewedAt: new Date(),
        approvedAt: inferredCourseFileStatus === EduTrustCourseFileStatus.APPROVED ? new Date() : null,
      },
      update: {
        ...fileData,
        lastReviewedAt: new Date(),
        approvedAt: inferredCourseFileStatus === EduTrustCourseFileStatus.APPROVED ? new Date() : null,
      },
    });
  }

  return Response.json({ ok: true, profile });
}
