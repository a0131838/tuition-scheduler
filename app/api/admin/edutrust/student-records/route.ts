import { EduTrustStudentRecordStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { inferEduTrustStudentRecordStatus } from "@/lib/edutrust-student-record";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function trimOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function enumValue<T extends Record<string, string>>(values: T, raw: unknown, fallback: T[keyof T]) {
  const value = String(raw ?? "").trim();
  return Object.values(values).includes(value) ? (value as T[keyof T]) : fallback;
}

function dateOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(`${text}T00:00:00.000+08:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const studentId = String(body?.studentId ?? "").trim();
  const courseId = String(body?.courseId ?? "").trim();
  const packageId = trimOrNull(body?.packageId);
  if (!studentId || !courseId) return bad("Missing studentId or courseId");

  const [student, course, pkg] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
    packageId
      ? prisma.coursePackage.findUnique({ where: { id: packageId }, select: { id: true, studentId: true, courseId: true } })
      : Promise.resolve(null),
  ]);
  if (!student) return bad("Student not found", 404);
  if (!course) return bad("Course not found", 404);
  if (pkg && (pkg.studentId !== studentId || pkg.courseId !== courseId)) {
    return bad("Package does not match this student and course");
  }

  const requestedStatus = enumValue(
    EduTrustStudentRecordStatus,
    body?.status,
    EduTrustStudentRecordStatus.DRAFT
  );
  const data = {
    studentId,
    courseId,
    packageId,
    diagnosticAssessment: trimOrNull(body?.diagnosticAssessment),
    individualLearningPlan: trimOrNull(body?.individualLearningPlan),
    progressReview: trimOrNull(body?.progressReview),
    finalAssessment: trimOrNull(body?.finalAssessment),
    completionRecord: trimOrNull(body?.completionRecord),
    attendanceEvidenceNote: trimOrNull(body?.attendanceEvidenceNote),
    contractEvidenceNote: trimOrNull(body?.contractEvidenceNote),
    outcomeSummary: trimOrNull(body?.outcomeSummary),
    externalOutcome: trimOrNull(body?.externalOutcome),
    startedAt: dateOrNull(body?.startedAt),
    completedAt: dateOrNull(body?.completedAt),
    reviewedAt:
      requestedStatus === EduTrustStudentRecordStatus.COMPLETED ||
      requestedStatus === EduTrustStudentRecordStatus.NEEDS_REVIEW
        ? new Date()
        : null,
    reviewedBy:
      requestedStatus === EduTrustStudentRecordStatus.COMPLETED ||
      requestedStatus === EduTrustStudentRecordStatus.NEEDS_REVIEW
        ? admin.email
        : null,
  };
  const status = inferEduTrustStudentRecordStatus({ ...data, requestedStatus });

  const existing = packageId
    ? await prisma.eduTrustStudentCourseRecord.findUnique({
        where: { studentId_courseId_packageId: { studentId, courseId, packageId } },
      })
    : await prisma.eduTrustStudentCourseRecord.findFirst({
        where: { studentId, courseId, packageId: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });

  const record = existing
    ? await prisma.eduTrustStudentCourseRecord.update({
        where: { id: existing.id },
        data: { ...data, status },
      })
    : await prisma.eduTrustStudentCourseRecord.create({
        data: { ...data, status },
      });

  return Response.json({ ok: true, record });
}

