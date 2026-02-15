import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isGroupPackNote } from "@/lib/package-mode";
import { findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { coursePackageAccessibleByStudent } from "@/lib/package-sharing";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const classId = String(body?.classId ?? "");
  const studentId = String(body?.studentId ?? "");

  if (!classId || !studentId) {
    return bad("Missing classId or studentId");
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, courseId: true, capacity: true },
  });
  if (!cls) return bad("Class not found", 404);

  const now = new Date();
  const candidatePkgs = await prisma.coursePackage.findMany({
    where: {
      ...coursePackageAccessibleByStudent(studentId),
      courseId: cls.courseId,
      status: "ACTIVE",
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
    select: { id: true, type: true, remainingMinutes: true, note: true },
  });

  const activePkg = candidatePkgs.find((p) => {
    if (p.type === "MONTHLY") return true;
    if (p.type !== "HOURS" || (p.remainingMinutes ?? 0) <= 0) return false;
    if (cls.capacity === 1) return !isGroupPackNote(p.note);
    return true;
  });
  if (!activePkg) return bad("Student has no active package for this course", 409, { code: "NO_ACTIVE_PACKAGE" });

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });
  if (exists) return bad("Already enrolled", 409, { code: "ALREADY_ENROLLED" });

  const courseConflict = await findStudentCourseEnrollment(studentId, cls.courseId, classId);
  if (courseConflict) {
    return bad("Course enrollment conflict", 409, { code: "COURSE_CONFLICT", detail: formatEnrollmentConflict(courseConflict) });
  }

  const created = await prisma.enrollment.create({
    data: { classId, studentId },
    select: { id: true, classId: true, studentId: true },
  });

  return Response.json({ ok: true, enrollment: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const classId = String(body?.classId ?? "");
  const studentId = String(body?.studentId ?? "");
  if (!classId || !studentId) return bad("Missing classId or studentId");

  const result = await prisma.enrollment.deleteMany({ where: { classId, studentId } });
  return Response.json({ ok: true, deleted: result.count });
}
